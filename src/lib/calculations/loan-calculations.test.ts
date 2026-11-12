import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { type InterestMethod, PaymentType, type Transaction, TransactionType } from '@prisma/client';

import type { LoanWithRelations } from '@/types/loans';

import { calculateLoanFields, calculateLoanPerYear } from './loan-calculations';

const stichtag = new Date(2024, 11, 31);
const asOf = new Date(2026, 0, 1, 12);

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

function loan(interestMethod: InterestMethod, transactions: Transaction[]): LoanWithRelations {
  return {
    id: 'loan-1',
    loanNumber: 1,
    amount: 10_000,
    interestRate: 2,
    altInterestMethod: null,
    signDate: new Date(2020, 0, 1),
    terminationType: 'TERMINATION',
    terminationDate: null,
    isSavingsContract: false,
    transactions,
    notes: [],
    files: [],
    lender: { project: { configuration: { interestMethod } }, notes: [], files: [] },
  } as unknown as LoanWithRelations;
}

const opening = [
  transaction('deposit', TransactionType.DEPOSIT, 10_000),
  transaction('carryover', TransactionType.INTERESTCARRYOVER, 500),
];

/** Interest booked in the Stichtag year itself: none, or one Zinstag if the day money arrives counts. */
const stichtagYear = (interestMethod: InterestMethod, transactions = opening) => {
  const [first] = calculateLoanPerYear(loan(interestMethod, transactions), asOf);
  assert.equal(first?.year, 2024);
  assert.ok((first?.interest.toNumber() ?? 1) < 1, 'at most one Zinstag of interest in the Stichtag year');
  return first as NonNullable<typeof first>;
};

describe('Zinsübertrag in the interest calculation', () => {
  it('raises the Kontostand on the Stichtag without counting as interest of that year', () => {
    const year2024 = stichtagYear('ACT_365_COMPOUND');
    assert.equal(year2024.interestCarryover.toNumber(), 500);
    assert.equal(year2024.deposits.toNumber(), 10_000);
    assert.equal(year2024.end.minus(year2024.interest).toNumber(), 10_500);
  });

  it('earns interest with a compounding Zinsmethode', () => {
    const begin = stichtagYear('ACT_365_COMPOUND').end;
    const year2025 = calculateLoanPerYear(loan('ACT_365_COMPOUND', opening), asOf).find((row) => row.year === 2025);
    assert.equal(year2025?.interest.toNumber(), begin.times(0.02).toDecimalPlaces(2).toNumber());
  });

  it('earns no interest with a non-compounding Zinsmethode', () => {
    const begin = stichtagYear('ACT_365_NOCOMPOUND').end;
    const year2025 = calculateLoanPerYear(loan('ACT_365_NOCOMPOUND', opening), asOf).find((row) => row.year === 2025);
    assert.equal(year2025?.interest.toNumber(), 200);
    assert.equal(year2025?.end.toNumber(), begin.plus(200).toNumber());
  });

  it('counts towards the lifetime interest but not the interest of a year', () => {
    const calculated = calculateLoanFields(loan('ACT_365_NOCOMPOUND', opening), { toDate: asOf, interestYear: 2025 });
    const yearlyInterest = calculateLoanPerYear(loan('ACT_365_NOCOMPOUND', opening), asOf).reduce(
      (sum, row) => sum + row.interest.toNumber(),
      0,
    );
    assert.equal(calculated.interestCarryover, 500);
    assert.equal(calculated.interest, Number((yearlyInterest + 500).toFixed(2)));
    assert.equal(calculated.balance, Number((10_000 + calculated.interest).toFixed(2)));
    const virtualInterestRows = calculated.transactions.filter((row) => row.type === TransactionType.INTEREST);
    assert.ok(virtualInterestRows.every((row) => row.amount < 500));
  });

  it('a non-compounding Zinsauszahlung of the carried-over interest leaves the interest base untouched', () => {
    const payout = transaction('payout', TransactionType.INTERESTPAYMENT, -500, new Date(2025, 2, 31));
    const transactions = [...opening, payout];
    const begin = stichtagYear('ACT_365_NOCOMPOUND', transactions).end;
    const year2025 = calculateLoanPerYear(loan('ACT_365_NOCOMPOUND', transactions), asOf).find(
      (row) => row.year === 2025,
    );
    assert.equal(year2025?.interest.toNumber(), 200);
    assert.equal(year2025?.end.toNumber(), begin.plus(200).minus(500).toNumber());
  });
});
