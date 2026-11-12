import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { InterestMethod, Prisma, TransactionType } from '@prisma/client';
import moment from 'moment';

import {
  calculateInterestDaily,
  calculateLoanPerMonth,
  calculateLoanPerYear,
  getInterestDays,
  getInterestRules,
} from './loan-calculations';

// Local calendar dates keep the day count independent of the process timezone.
const calendarDay = (date: string) => moment(date, 'YYYY-MM-DD', true);

// A date as Prisma returns it: midnight UTC, which is 01:00 or 02:00 in Berlin.
const storedDate = (date: string) => moment(new Date(date));

describe('getInterestDays with ACT methods', () => {
  // All ACT methods count days the same way. They differ only in the base.
  const method = InterestMethod.ACT_365_NOCOMPOUND;

  it('splits a period at the year boundary without losing a day', () => {
    const deposit = storedDate('2023-01-15');
    const end = storedDate('2024-03-10');
    assert.equal(
      getInterestDays(deposit, undefined, method) + getInterestDays(undefined, end, method),
      moment(end).startOf('day').diff(moment(deposit).startOf('day'), 'days'),
    );
  });

  it('counts calendar days when a period starts in summer time and ends in winter time', () => {
    assert.equal(
      getInterestDays(storedDate('2019-04-01'), storedDate('2019-11-15'), method),
      calendarDay('2019-11-15').diff(calendarDay('2019-04-01'), 'days'),
    );
  });
});

describe('getInterestDays with E30/360', () => {
  const method = InterestMethod.E30_360_NOCOMPOUND;

  it('counts a start on the 31st like a start on the 30th', () => {
    assert.equal(
      getInterestDays(calendarDay('2023-01-31'), calendarDay('2023-03-31'), method),
      getInterestDays(calendarDay('2023-01-30'), calendarDay('2023-03-31'), method),
    );
  });

  it('counts a start on the 31st like a start on the 30th when the period runs to the end of the year', () => {
    assert.equal(
      getInterestDays(calendarDay('2023-01-31'), undefined, method),
      getInterestDays(calendarDay('2023-01-30'), undefined, method),
    );
  });

  it('counts two months of 30 days from 31 January to 31 March', () => {
    assert.equal(
      getInterestDays(calendarDay('2023-01-31'), calendarDay('2023-03-31'), method),
      2 * 30,
      'E30/360 treats the 31st as the 30th at the start and at the end of the period',
    );
  });

  it('counts an end on the 31st like an end on the 30th within one month', () => {
    assert.equal(
      getInterestDays(calendarDay('2023-01-15'), calendarDay('2023-01-30'), method),
      30 - 15,
      'premise: from 15 to 30 January counts 15 days',
    );
    assert.equal(
      getInterestDays(calendarDay('2023-01-15'), calendarDay('2023-01-31'), method),
      getInterestDays(calendarDay('2023-01-15'), calendarDay('2023-01-30'), method),
    );
  });

  it('counts a start on 31 December like a start on 30 December when the period runs to the end of the year', () => {
    assert.equal(
      getInterestDays(calendarDay('2023-12-30'), undefined, method),
      1,
      'premise: from 30 December the only interest day is the night to 1 January',
    );
    assert.equal(
      getInterestDays(calendarDay('2023-12-31'), undefined, method),
      getInterestDays(calendarDay('2023-12-30'), undefined, method),
    );
  });
});

describe('getInterestRules', () => {
  it('keeps the old rules for Zinsjahre before the Umstellungsjahr', () => {
    assert.equal(getInterestRules(2026, 2027), 'legacy');
    assert.equal(getInterestRules(2027, 2027), 'corrected');
    assert.equal(getInterestRules(2028, 2027), 'corrected');
  });

  it('uses the corrected rules for every Zinsjahr of a project without an Umstellungsjahr', () => {
    assert.equal(getInterestRules(2010, null), 'corrected');
  });
});

describe('calculateInterestDaily', () => {
  const amount = new Prisma.Decimal(10_000);
  const rate = new Prisma.Decimal(2);
  const interest = (
    from: string,
    to: string | undefined,
    method: InterestMethod,
    rules: 'legacy' | 'corrected' = 'corrected',
  ) =>
    calculateInterestDaily(storedDate(from), to ? storedDate(to) : undefined, amount, rate, method, rules)
      .toDecimalPlaces(2)
      .toNumber();

  it('keeps the lost day at the year end under the old rules', () => {
    assert.equal(interest('2025-12-31', undefined, InterestMethod.ACT_360_COMPOUND, 'legacy'), 0);
    assert.equal(interest('2025-12-31', undefined, InterestMethod.ACT_360_COMPOUND), 0.56);
  });

  it('pays a part of a Zinsjahr at most the interest of a full Zinsjahr under ACT/360', () => {
    assert.equal(interest('2025-01-01', undefined, InterestMethod.ACT_360_COMPOUND), 200);
    assert.equal(interest('2025-01-06', undefined, InterestMethod.ACT_360_COMPOUND), 200);
    assert.equal(interest('2025-01-07', undefined, InterestMethod.ACT_360_COMPOUND), 199.44);
  });

  it('pays a part of a leap year at most the interest of a full Zinsjahr under ACT/365', () => {
    assert.equal(interest('2024-01-01', undefined, InterestMethod.ACT_365_NOCOMPOUND), 200);
  });

  it('does not cap the old rules', () => {
    assert.equal(interest('2025-01-01', undefined, InterestMethod.ACT_360_COMPOUND, 'legacy'), 202.22);
  });
});

const loanWith = (
  method: InterestMethod,
  interestChangeoverYear: number | null,
  transactions: { date: string; amount: number; type?: TransactionType }[],
) =>
  ({
    interestRate: 2,
    altInterestMethod: null,
    transactions: transactions.map((transaction, index) => ({
      id: `transaction-${index}`,
      type: transaction.type ?? TransactionType.DEPOSIT,
      date: new Date(transaction.date),
      amount: transaction.amount,
    })),
    lender: { project: { configuration: { interestMethod: method, interestChangeoverYear } } },
  }) as unknown as Parameters<typeof calculateLoanPerYear>[0];

describe('calculateLoanPerYear with an Umstellungsjahr', () => {
  const interestOf = (loan: Parameters<typeof calculateLoanPerYear>[0], year: number) =>
    calculateLoanPerYear(loan, new Date('2028-06-30'))
      .find((entry) => entry.year === year)
      ?.interest.toNumber();

  it('calculates Zinsjahre before the Umstellungsjahr with the old rules and later ones with the corrected rules', () => {
    const transactions = [
      { date: '2025-03-15', amount: 10_000 },
      { date: '2027-03-15', amount: 10_000 },
    ];
    const legacy = loanWith(InterestMethod.ACT_360_NOCOMPOUND, 2027, transactions);
    const corrected = loanWith(InterestMethod.ACT_360_NOCOMPOUND, null, transactions);

    // 291 of 292 days under the old rules, 292 under the corrected ones.
    assert.equal(interestOf(legacy, 2025), 161.67);
    assert.equal(interestOf(corrected, 2025), 162.22);
    // From the Umstellungsjahr on both use the corrected rules.
    assert.equal(interestOf(legacy, 2027), interestOf(corrected, 2027));
    assert.equal(interestOf(legacy, 2027), 362.22);
  });
});

describe('calculateLoanPerMonth', () => {
  it('weighs each month by all of its days', () => {
    const loan = loanWith(InterestMethod.ACT_365_NOCOMPOUND, null, [{ date: '2025-01-01', amount: 10_000 }]);
    const months = calculateLoanPerMonth(loan as Parameters<typeof calculateLoanPerMonth>[0], new Date('2026-06-30'));
    const interestOf = (month: number) =>
      months.find((entry) => entry.year === 2025 && entry.month === month)?.interest.toNumber();

    assert.equal(interestOf(1), 16.99, '200 × 31 / 365');
    assert.equal(interestOf(2), 15.34, '200 × 28 / 365');
  });
});
