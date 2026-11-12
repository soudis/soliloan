import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InterestMethod, Prisma, TransactionType } from '@prisma/client';

import { calculateLoanPerYear } from '@/lib/calculations/loan-calculations';
import {
  DEPOSIT,
  fixtureLoan,
  INTERESTPAYMENT,
  NOTRECLAIMED,
  NOTRECLAIMEDPARTIAL,
  TERMINATION,
  tx,
  WITHDRAWAL,
} from '@/test/loan-fixture';
import { buildJahresliste, JAHRESLISTE_VORGAENGE } from './jahresliste';

const YEAR = 2025;

/** A Kredit that closes on `closeDate` and leaves `leftover` € (the Abschlussdifferenz) before the Zinskorrektur. */
function closingLoan(options: {
  interestMethod: InterestMethod;
  lastName: string;
  interestRate: number;
  transactions: ReturnType<typeof tx>[];
  close: typeof TERMINATION | typeof NOTRECLAIMED;
  closeDate: Date;
  leftover: number;
}) {
  const { interestMethod, interestRate, transactions } = options;
  const open = fixtureLoan({ interestRate, interestMethod, transactions });
  const balance = calculateLoanPerYear(open, options.closeDate).at(-1)?.end ?? new Prisma.Decimal(0);
  return fixtureLoan({
    interestRate,
    interestMethod,
    lender: { lastName: options.lastName },
    transactions: [...transactions, tx(options.close, options.closeDate, -balance.minus(options.leftover).toNumber())],
  });
}

function portfolio(interestMethod: InterestMethod) {
  return [
    // runs through the year with a Teilrückzahlung and a Zinsauszahlung
    fixtureLoan({
      interestRate: 3,
      interestMethod,
      lender: { lastName: 'Running' },
      transactions: [
        tx(DEPOSIT, new Date(2022, 4, 3), 20000),
        tx(DEPOSIT, new Date(2025, 3, 30), 5000),
        tx(WITHDRAWAL, new Date(2025, 8, 1), -2500),
        tx(INTERESTPAYMENT, new Date(2025, 0, 15), -600),
      ],
    }),
    // closes during the year with a Zinskorrektur
    closingLoan({
      interestMethod,
      lastName: 'Closing',
      interestRate: 1.75,
      transactions: [tx(DEPOSIT, new Date(2023, 2, 15), 7777.77), tx(WITHDRAWAL, new Date(2025, 1, 10), -1000)],
      close: TERMINATION,
      closeDate: new Date(2025, 9, 17),
      leftover: 0.04,
    }),
    // Teilerlassung, then Erlassung of the rest
    closingLoan({
      interestMethod,
      lastName: 'Forgiving',
      interestRate: 0.5,
      transactions: [tx(DEPOSIT, new Date(2024, 6, 1), 3000), tx(NOTRECLAIMEDPARTIAL, new Date(2025, 2, 1), -1000)],
      close: NOTRECLAIMED,
      closeDate: new Date(2025, 5, 30),
      leftover: 0,
    }),
    // starts during the year
    fixtureLoan({
      interestRate: 1,
      interestMethod,
      lender: { lastName: 'New' },
      transactions: [tx(DEPOSIT, new Date(2025, 10, 20), 1234.56)],
    }),
    // closed before the year: not in the Jahresliste
    fixtureLoan({
      interestRate: 1,
      interestMethod,
      lender: { lastName: 'Gone' },
      transactions: [tx(DEPOSIT, new Date(2020, 0, 1), 1000), tx(TERMINATION, new Date(2024, 0, 1), -1040.4)],
    }),
    // starts after the year: not in the Jahresliste
    fixtureLoan({
      interestRate: 1,
      interestMethod,
      lender: { lastName: 'Later' },
      transactions: [tx(DEPOSIT, new Date(2026, 0, 5), 1000)],
    }),
  ];
}

const sumOf = (sums: { vorgang: string; amount: number }[], vorgang: string) =>
  sums.find((row) => row.vorgang === vorgang)?.amount ?? Number.NaN;

describe('buildJahresliste', () => {
  for (const interestMethod of Object.values(InterestMethod)) {
    it(`reconciles the Summen with ${interestMethod}`, () => {
      const loans = portfolio(interestMethod);
      const zinskorrektur = calculateLoanPerYear(loans[1], new Date(YEAR + 1, 0, 2)).find(
        (entry) => entry.year === YEAR,
      );
      assert.equal(zinskorrektur?.interestError.toFixed(2), '-0.04', 'the fixture produces a Zinskorrektur');

      const { sums } = buildJahresliste(loans, YEAR);

      assert.deepEqual(
        sums.map((row) => row.vorgang),
        JAHRESLISTE_VORGAENGE.filter((vorgang) => vorgang !== TransactionType.INTERESTCARRYOVER),
      );
      const movements = sums
        .filter((row) => row.vorgang !== 'OPENING_BALANCE' && row.vorgang !== 'CLOSING_BALANCE')
        .reduce((total, row) => total.plus(row.amount), new Prisma.Decimal(sumOf(sums, 'OPENING_BALANCE')));
      assert.equal(movements.toFixed(2), new Prisma.Decimal(sumOf(sums, 'CLOSING_BALANCE')).toFixed(2));
      assert.ok(sumOf(sums, 'NOTRECLAIMEDPARTIAL') < 0);
      assert.ok(sumOf(sums, 'NOTRECLAIMED') < 0);
      assert.ok(sumOf(sums, 'TERMINATION') < 0);
    });
  }

  it('lists the rows of each Kredit and leaves out Kredite outside the year', () => {
    const loans = portfolio('ACT_365_NOCOMPOUND');
    const { rows, lenders } = buildJahresliste(loans, YEAR);

    assert.deepEqual(new Set(rows.map((row) => row.lastName)), new Set(['Running', 'Closing', 'Forgiving', 'New']));
    assert.deepEqual(
      lenders.map((lender) => lender.id),
      [loans[0], loans[1], loans[2], loans[3]].map((loan) => loan.lender.id),
    );

    const closing = rows.filter((row) => row.lastName === 'Closing').map((row) => row.vorgang);
    assert.deepEqual(closing, ['OPENING_BALANCE', 'WITHDRAWAL', 'INTEREST', 'TERMINATION']);
    const closingInterest = rows.find((row) => row.lastName === 'Closing' && row.vorgang === 'INTEREST');
    assert.equal(closingInterest?.date.toISOString(), '2025-10-17T00:00:00.000Z');

    const running = rows.filter((row) => row.lastName === 'Running');
    assert.deepEqual(
      running.map((row) => row.vorgang),
      ['OPENING_BALANCE', 'INTERESTPAYMENT', 'DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'CLOSING_BALANCE'],
    );
    const end = running.at(-1);
    assert.equal(end?.date.toISOString(), '2025-12-31T00:00:00.000Z');
    assert.equal(end?.interestRate, 3);
    assert.equal(end?.interestAmount, running.find((row) => row.vorgang === 'INTEREST')?.amount);
    assert.ok(running.slice(0, -1).every((row) => row.interestAmount === null));

    const newLoan = rows.filter((row) => row.lastName === 'New').map((row) => row.vorgang);
    assert.deepEqual(newLoan, ['DEPOSIT', 'INTEREST', 'CLOSING_BALANCE']);
  });

  it('sorts by date, then Vorgang, then name', () => {
    const { rows } = buildJahresliste(portfolio('E30_360_COMPOUND'), YEAR);
    const keys = rows.map((row) => row.date.getTime());
    assert.deepEqual(
      keys,
      [...keys].sort((a, b) => a - b),
    );
    const firstDay = rows.filter((row) => row.date.getTime() === Date.UTC(YEAR, 0, 1)).map((row) => row.lastName);
    assert.deepEqual(firstDay, ['Closing', 'Forgiving', 'Running']);
    const lastDay = rows.filter((row) => row.date.getTime() === Date.UTC(YEAR, 11, 31)).map((row) => row.vorgang);
    assert.deepEqual(lastDay, ['INTEREST', 'INTEREST', 'CLOSING_BALANCE', 'CLOSING_BALANCE']);
  });

  it('lists a Zinsübertrag in the year of its Stichtag and keeps the Summen reconciled', () => {
    const loan = fixtureLoan({
      interestRate: 2,
      interestMethod: 'ACT_365_NOCOMPOUND',
      transactions: [
        tx(DEPOSIT, new Date(YEAR, 2, 31), 10000),
        tx(TransactionType.INTERESTCARRYOVER, new Date(YEAR, 2, 31), 450),
      ],
    });
    const { sums, rows } = buildJahresliste([loan], YEAR);

    assert.equal(sumOf(sums, TransactionType.INTERESTCARRYOVER), 450);
    assert.ok(rows.some((row) => row.vorgang === TransactionType.INTERESTCARRYOVER && row.amount === 450));
    const movements = sums
      .filter((row) => row.vorgang !== 'OPENING_BALANCE' && row.vorgang !== 'CLOSING_BALANCE')
      .reduce((total, row) => total.plus(row.amount), new Prisma.Decimal(sumOf(sums, 'OPENING_BALANCE')));
    assert.equal(movements.toFixed(2), new Prisma.Decimal(sumOf(sums, 'CLOSING_BALANCE')).toFixed(2));
  });
});
