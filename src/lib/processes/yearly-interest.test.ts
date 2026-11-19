import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TerminationType } from '@prisma/client';

import { DEPOSIT, fixtureLoan, INTERESTPAYMENT, NOTRECLAIMED, TERMINATION, tx, WITHDRAWAL } from '@/test/loan-fixture';
import type { LoanWithRelations } from '@/types/loans';
import { countOpenYearlyInterest, unpaidYearlyInterest } from './yearly-interest';

// 10,000 € at 2 % (ACT/365, no compounding): 200.00 € Zinsertrag per full year, 99.73 € from 1 Jan to 1 Jul 2024.
const yearlyLoan = (transactions: Parameters<typeof fixtureLoan>[0]['transactions']) =>
  fixtureLoan({ interestRate: 2, interestMethod: 'ACT_365_NOCOMPOUND', interestPaymentType: 'YEARLY', transactions });

const deposit2023 = tx(DEPOSIT, new Date(2023, 0, 1), 10000);
const payout2023 = tx(INTERESTPAYMENT, new Date(2023, 11, 31), -200);

describe('Jährliche Zinsauszahlung', () => {
  it('leaves out a Kredit whose Rückzahlung paid out the Kontostand in that year', () => {
    const loan = yearlyLoan([deposit2023, payout2023, tx(TERMINATION, new Date(2024, 6, 1), -10099.73)]);

    assert.equal(unpaidYearlyInterest(loan, 2024), 0);
    assert.equal(countOpenYearlyInterest([loan], 2024), 0);
  });

  it('leaves out earlier years whose Zinsertrag the Rückzahlung paid out with the Kontostand', () => {
    const loan = yearlyLoan([deposit2023, tx(TERMINATION, new Date(2024, 6, 1), -10299.73)]);

    assert.equal(unpaidYearlyInterest(loan, 2023), 0);
    assert.equal(unpaidYearlyInterest(loan, 2024), 0);
  });

  it('leaves out a Kredit closed as Nicht rückgefordert', () => {
    const loan = yearlyLoan([deposit2023, payout2023, tx(NOTRECLAIMED, new Date(2024, 6, 1), -10099.73)]);

    assert.equal(unpaidYearlyInterest(loan, 2024), 0);
  });

  it('keeps a Kredit that is terminated but not repaid yet', () => {
    const loan = {
      ...yearlyLoan([deposit2023, payout2023]),
      terminationType: TerminationType.TERMINATION,
      terminationDate: new Date(2024, 2, 1),
    } as LoanWithRelations;

    assert.equal(unpaidYearlyInterest(loan, 2024), 200);
    assert.equal(countOpenYearlyInterest([loan], 2024), 1);
  });

  it('keeps an open Kredit without a Zinsauszahlung for the year', () => {
    const loan = yearlyLoan([deposit2023, payout2023]);

    assert.equal(unpaidYearlyInterest(loan, 2024), 200);
  });

  it('keeps a Kredit after a partial withdrawal that leaves a Kontostand', () => {
    const loan = yearlyLoan([deposit2023, payout2023, tx(WITHDRAWAL, new Date(2024, 6, 1), -5000)]);

    assert.ok(unpaidYearlyInterest(loan, 2024) > 0);
  });

  it('leaves out a year that is paid out', () => {
    const loan = yearlyLoan([deposit2023, payout2023]);

    assert.equal(unpaidYearlyInterest(loan, 2023), 0);
  });
});
