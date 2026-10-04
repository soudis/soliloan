import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SavingsRateType } from '@prisma/client';
import moment from 'moment';

import { expectedFailure } from '@/test/expected-failure';
import { makeSavingsLoan } from '@/test/fixtures/loan';

import {
  calculateSavingsDepositCountFromDates,
  calculateSavingsDepositCountFromMonthlyAmount,
  calculateSavingsFirstDepositDate,
  calculateSavingsLastDepositDate,
  calculateSavingsMonthlyAmount,
  getExpectedDepositSchedule,
  resolveSavingsLastDepositDate,
} from './savings-contract';

// Deposit dates are calendar dates. Comparing the formatted local date keeps the assertions
// identical under both CI timezones, where the underlying instants differ around DST.
const calendarDate = (value: Date | null | undefined) => (value ? moment(value).format('YYYY-MM-DD') : null);

describe('calculateSavingsMonthlyAmount', () => {
  it('divides the loan amount evenly across the deposits', () => {
    assert.equal(calculateSavingsMonthlyAmount(10000, 4)?.toFixed(2), '2500.00');
  });

  it('rounds the monthly amount to whole cents', () => {
    assert.equal(calculateSavingsMonthlyAmount(10000, 3)?.toFixed(2), '3333.33');
  });

  it('returns null when the amount or the count is not positive', () => {
    assert.equal(calculateSavingsMonthlyAmount(0, 5), null);
    assert.equal(calculateSavingsMonthlyAmount(10000, 0), null);
    assert.equal(calculateSavingsMonthlyAmount(Number.NaN, 5), null);
  });

  expectedFailure('rounds half a cent up, like the interest calculation does', () => {
    assert.equal((169 * 100) / 40, 422.5, 'premise: 169 over 40 lands exactly on half a cent');
    assert.ok((169 / 40) * 100 < 422.5, 'premise: the float product lands below half a cent');
    assert.equal(calculateSavingsMonthlyAmount(169, 40)?.toFixed(2), '4.23');
  });
});

describe('calculateSavingsLastDepositDate', () => {
  it('places the last deposit count minus one months after the first', () => {
    assert.equal(calendarDate(calculateSavingsLastDepositDate(new Date('2023-01-15'), 12)), '2023-12-15');
  });

  it('clamps the last deposit to the end of a shorter month', () => {
    assert.equal(calendarDate(calculateSavingsLastDepositDate(new Date('2023-01-31'), 2)), '2023-02-28');
  });

  it('returns the first deposit date for a single deposit', () => {
    assert.equal(calendarDate(calculateSavingsLastDepositDate(new Date('2023-01-15'), 1)), '2023-01-15');
  });

  it('returns null for a count below one', () => {
    assert.equal(calculateSavingsLastDepositDate(new Date('2023-01-15'), 0), null);
  });
});

describe('calculateSavingsFirstDepositDate', () => {
  it('is the inverse of the last deposit date for dates away from month ends', () => {
    assert.equal(calendarDate(calculateSavingsFirstDepositDate(new Date('2023-12-15'), 12)), '2023-01-15');
  });

  it('derives the first deposit from the last without undoing month end clamping', () => {
    const last = calculateSavingsLastDepositDate(new Date('2023-01-31'), 2);
    assert.equal(calendarDate(last), '2023-02-28', 'premise: the last deposit was clamped');
    assert.equal(calendarDate(calculateSavingsFirstDepositDate(last as Date, 2)), '2023-01-28');
  });
});

describe('calculateSavingsDepositCountFromDates', () => {
  it('counts one deposit when the first and last date share the day', () => {
    assert.equal(calculateSavingsDepositCountFromDates(new Date('2023-01-15'), new Date('2023-01-15')), 1);
  });

  it('recovers the deposit count from the derived last deposit date', () => {
    const first = new Date('2023-01-15');
    const last = calculateSavingsLastDepositDate(first, 12);
    assert.ok(last, 'premise: the last deposit date is derivable');
    assert.equal(calculateSavingsDepositCountFromDates(first, last), 12);
  });

  it('returns null when the last deposit precedes the first', () => {
    assert.equal(calculateSavingsDepositCountFromDates(new Date('2023-02-15'), new Date('2023-01-15')), null);
  });
});

describe('calculateSavingsDepositCountFromMonthlyAmount', () => {
  it('takes the ceiling so the deposits cover the loan amount', () => {
    assert.ok(3 * 3000 < 10000, 'premise: three deposits fall short of the amount');
    assert.equal(calculateSavingsDepositCountFromMonthlyAmount(10000, 3000), 4);
  });

  it('needs one deposit more than the count the monthly amount was derived from', () => {
    const monthly = calculateSavingsMonthlyAmount(10000, 3);
    assert.ok(monthly, 'premise: the monthly amount is derivable');
    assert.ok(3 * monthly < 10000, 'premise: three rounded deposits fall short of the amount');
    assert.equal(calculateSavingsDepositCountFromMonthlyAmount(10000, monthly), 4);
  });
});

describe('getExpectedDepositSchedule', () => {
  it('builds one deposit per month at the fixed monthly amount', () => {
    const loan = makeSavingsLoan({ savingsDepositCount: 3, savingsMonthlyAmount: 1000 });
    const schedule = getExpectedDepositSchedule(loan);
    assert.deepEqual(
      schedule.map((entry) => [calendarDate(entry.date), entry.amount]),
      [
        ['2023-01-15', 1000],
        ['2023-02-15', 1000],
        ['2023-03-15', 1000],
      ],
    );
  });

  it('leaves the amounts open for a varying rate', () => {
    const loan = makeSavingsLoan({ savingsRateType: SavingsRateType.VARYING, savingsDepositCount: 2 });
    assert.deepEqual(
      getExpectedDepositSchedule(loan).map((entry) => entry.amount),
      [null, null],
    );
  });

  it('starts at the sign date when no first deposit date is set', () => {
    const loan = makeSavingsLoan({ savingsFirstDepositDate: null, savingsDepositCount: 1 });
    assert.equal(calendarDate(getExpectedDepositSchedule(loan)[0]?.date), calendarDate(loan.signDate));
  });

  it('falls back to a single deposit of the full amount for a regular loan', () => {
    const loan = makeSavingsLoan({ isSavingsContract: false });
    assert.deepEqual(getExpectedDepositSchedule(loan), [{ date: loan.signDate, amount: loan.amount }]);
  });
});

describe('resolveSavingsLastDepositDate', () => {
  it('prefers an explicit last deposit date over the derived one', () => {
    const resolved = resolveSavingsLastDepositDate(new Date('2023-01-15'), new Date('2023-06-20'), 3);
    assert.equal(calendarDate(resolved), '2023-06-20');
  });

  it('derives the last date from the first date and the count when it is missing', () => {
    const resolved = resolveSavingsLastDepositDate(new Date('2023-01-15'), null, 3);
    assert.equal(calendarDate(resolved), '2023-03-15');
  });
});
