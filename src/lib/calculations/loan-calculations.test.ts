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

describe('Zinsübertrag in the interest calculation', () => {
  it('raises the Kontostand on the Stichtag without counting as interest of that year', () => {
    const [year2024] = calculateLoanPerYear(loan('ACT_365_COMPOUND', opening), asOf);
    assert.equal(year2024?.year, 2024);
    assert.equal(year2024?.interest.toNumber(), 0);
    assert.equal(year2024?.interestCarryover.toNumber(), 500);
    assert.equal(year2024?.deposits.toNumber(), 10_000);
    assert.equal(year2024?.end.toNumber(), 10_500);
  });

  it('earns interest with a compounding Zinsmethode', () => {
    const year2025 = calculateLoanPerYear(loan('ACT_365_COMPOUND', opening), asOf).find((row) => row.year === 2025);
    assert.equal(year2025?.interest.toNumber(), 210);
    assert.equal(year2025?.end.toNumber(), 10_710);
  });

  it('earns no interest with a non-compounding Zinsmethode', () => {
    const year2025 = calculateLoanPerYear(loan('ACT_365_NOCOMPOUND', opening), asOf).find((row) => row.year === 2025);
    assert.equal(year2025?.interest.toNumber(), 200);
    assert.equal(year2025?.end.toNumber(), 10_700);
  });

  it('counts towards the lifetime interest but not the interest of a year', () => {
    const calculated = calculateLoanFields(loan('ACT_365_NOCOMPOUND', opening), { toDate: asOf, interestYear: 2025 });
    const yearlyInterest = calculateLoanPerYear(loan('ACT_365_NOCOMPOUND', opening), asOf).reduce(
      (sum, row) => sum + row.interest.toNumber(),
      0,
    );
    assert.equal(calculated.interestCarryover, 500);
    assert.equal(calculated.interest, yearlyInterest + 500);
    assert.equal(calculated.balance, 10_000 + calculated.interest);
    const virtualInterestRows = calculated.transactions.filter((row) => row.type === TransactionType.INTEREST);
    assert.ok(virtualInterestRows.every((row) => row.amount !== 500));
  });

  it('a non-compounding Zinsauszahlung of the carried-over interest leaves the interest base untouched', () => {
    const payout = transaction('payout', TransactionType.INTERESTPAYMENT, -500, new Date(2025, 2, 31));
    const year2025 = calculateLoanPerYear(loan('ACT_365_NOCOMPOUND', [...opening, payout]), asOf).find(
      (row) => row.year === 2025,
    );
    assert.equal(year2025?.interest.toNumber(), 200);
    assert.equal(year2025?.end.toNumber(), 10_200);
  });
});
