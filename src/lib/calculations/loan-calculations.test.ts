import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Prisma } from '@prisma/client';

import { DEPOSIT, fixtureLoan, TERMINATION, tx } from '@/test/loan-fixture';
import { calculateLoanPerMonth, calculateLoanPerYear } from './loan-calculations';

const sum = (values: Prisma.Decimal[]) => values.reduce((total, value) => total.plus(value), new Prisma.Decimal(0));

describe('Zinskorrektur', () => {
  // 10,000 € at 2 % (ACT/365, no compounding): 200.00 € Zinsertrag in 2024, 99.18 € until 1 Jul 2025.
  // The Abschlusszahlung leaves 0.03 € on the Kredit, so the Abschlussdifferenz is −0.03 €.
  const loan = fixtureLoan({
    interestRate: 2,
    interestMethod: 'ACT_365_NOCOMPOUND',
    transactions: [
      tx(DEPOSIT, new Date(2024, 0, 1), 10000),
      tx(TERMINATION, new Date(2025, 6, 1), -10299.15),
    ],
  });

  it('equals the Abschlussdifferenz and leaves the Kontostand at 0', () => {
    const closingYear = calculateLoanPerYear(loan, new Date(2026, 0, 1)).at(-1);

    assert.equal(closingYear?.year, 2025);
    assert.equal(closingYear?.interestError.toFixed(2), '-0.03');
    assert.equal(closingYear?.interest.toFixed(2), '99.15');
    assert.equal(closingYear?.end.toFixed(2), '0.00');
  });

  it('is the same per year and per month', () => {
    const perYear = calculateLoanPerYear(loan, new Date(2026, 0, 1));
    const perMonth = calculateLoanPerMonth(loan, new Date(2026, 0, 1));

    assert.equal(sum(perMonth.map((month) => month.interestError)).toFixed(2), '-0.03');
    assert.equal(
      sum(perMonth.map((month) => month.interestError)).toFixed(2),
      sum(perYear.map((year) => year.interestError)).toFixed(2),
    );
    assert.equal(sum(perMonth.map((month) => month.interest)).toFixed(2), '299.15');
    assert.equal(perMonth.at(-1)?.end.toFixed(2), '0.00');
  });
});
