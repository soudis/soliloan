import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LoanMonthlyNumbers } from '@/types/dashboard';
import { buildCumulativeTimeline } from './cumulative-timeline';
import { getPeriodNumbers } from './rollup-period';

const month = (numbers: Partial<LoanMonthlyNumbers>): LoanMonthlyNumbers => ({
  begin: 0,
  end: 0,
  withdrawals: 0,
  deposits: 0,
  notReclaimed: 0,
  interestPaid: 0,
  interest: 0,
  interestCarryover: 0,
  interestError: 0,
  interestBaseAmount: 0,
  ...numbers,
});

describe('Zinsübertrag in the dashboard history', () => {
  // Imported on 1 Jan 2025: 10,000 € Einlagenstand and 500 € Zinsübertrag; 2 % without compounding.
  const history = {
    2025: {
      1: month({ begin: 0, deposits: 10_000, interestCarryover: 500, interest: 16.99, end: 10_516.99 }),
      2: month({ begin: 10_516.99, interest: 15.34, end: 10_532.33 }),
    },
  };

  it('adds up to the Kontostand with the Zinsübertrag as its own flow', () => {
    const [, february] = buildCumulativeTimeline(history);
    const { cumulative } = february as NonNullable<typeof february>;
    assert.equal(cumulative.interestCarryover, 500);
    assert.equal(
      (cumulative.begin + cumulative.deposits + cumulative.interestCarryover + cumulative.interest).toFixed(2),
      cumulative.end.toFixed(2),
    );
  });

  it('keeps the Zinsübertrag in the yearly rollup, also while its month is still open', () => {
    const january = new Date(2025, 0, 1);
    const loan = {
      history: { 2025: { 1: history[2025][1] } },
      transactions: [
        { type: 'DEPOSIT', date: january, amount: 10_000 },
        { type: 'INTERESTCARRYOVER', date: january, amount: 500 },
      ],
    } as unknown as Parameters<typeof getPeriodNumbers>[0];
    const period = { year: 2025, periodEnd: new Date(2025, 0, 15) } as Parameters<typeof getPeriodNumbers>[1];
    const numbers = getPeriodNumbers(loan, period, 'yearly');
    assert.equal(numbers?.interestCarryover, 500);
    assert.equal(numbers?.end, 10_516.99);
  });
});
