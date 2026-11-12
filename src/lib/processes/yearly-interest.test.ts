import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PaymentType, type Transaction, TransactionType } from '@prisma/client';

import { calculateLoanPerYear } from '@/lib/calculations/loan-calculations';
import type { LoanWithRelations } from '@/types/loans';

import { payoutAsOfDate, payoutBookingDate, unpaidYearlyInterest } from './yearly-interest';

const stichtag = new Date(2024, 11, 31);

function transaction(id: string, type: TransactionType, amount: number, date = stichtag): Transaction {
  return {
    id,
    loanId: 'loan-1',
    type,
    date,
    amount,
    paymentType: PaymentType.OTHER,
    lenderNotifiedAt: null,
    importId: null,
  };
}

function loan(transactions: Transaction[]): LoanWithRelations {
  return {
    id: 'loan-1',
    interestRate: 2,
    altInterestMethod: null,
    transactions,
    lender: { project: { configuration: { interestMethod: 'ACT_365_NOCOMPOUND' } } },
  } as unknown as LoanWithRelations;
}

const opening = [
  transaction('deposit', TransactionType.DEPOSIT, 10_000),
  transaction('carryover', TransactionType.INTERESTCARRYOVER, 500),
];

/** Interest of the Stichtag day itself: none, or one Zinstag if the day money arrives counts. */
const stichtagDayInterest = (transactions: Transaction[]) =>
  calculateLoanPerYear(loan(transactions), payoutAsOfDate(2024))
    .find((row) => row.year === 2024)
    ?.interest.toNumber() ?? 0;

describe('unpaidYearlyInterest with a Zinsübertrag', () => {
  it('pays out the Zinsübertrag with the year of its Stichtag', () => {
    assert.equal(unpaidYearlyInterest(loan(opening), 2024), 500 + stichtagDayInterest(opening));
  });

  it('is settled by the Zinsauszahlung of that year', () => {
    const payout = transaction('payout', TransactionType.INTERESTPAYMENT, -500, payoutBookingDate(2024));
    const transactions = [...opening, payout];
    assert.equal(unpaidYearlyInterest(loan(transactions), 2024), stichtagDayInterest(transactions));
  });

  it('leaves the following years to their own interest', () => {
    assert.equal(unpaidYearlyInterest(loan(opening), 2025), 200);
  });
});
