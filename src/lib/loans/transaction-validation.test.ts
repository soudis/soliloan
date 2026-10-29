import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { type Transaction, TransactionType } from '@prisma/client';

import { replayLedger, stateAt, toStoredAmount, type LedgerLoan } from './transaction-ledger';
import { changedPastYears, checkChange, previewTransaction } from './transaction-validation';

const loan = (overrides: Partial<LedgerLoan> = {}): LedgerLoan => ({
  amount: 1000,
  interestRate: 0,
  altInterestMethod: null,
  lender: { project: { configuration: { interestMethod: 'ACT_365_NOCOMPOUND' } } },
  ...overrides,
});

const day = (value: string) => {
  const [year, month, date] = value.split('-').map(Number) as [number, number, number];
  return new Date(year, month - 1, date);
};

let counter = 0;
const tx = (type: TransactionType, date: string, amount: number, id = `t${++counter}`): Transaction => ({
  id,
  loanId: 'loan',
  type,
  date: day(date),
  amount: toStoredAmount(type, amount),
  paymentType: 'BANK',
  lenderNotifiedAt: null,
});

const rules = (transactions: Transaction[], l = loan()) => replayLedger(l, transactions).violations.map((v) => v.rule);

describe('replayLedger rules', () => {
  it('accepts a plain deposit and a partial withdrawal', () => {
    assert.deepEqual(rules([tx('DEPOSIT', '2024-01-01', 1000), tx('WITHDRAWAL', '2024-03-01', 400)]), []);
  });

  it('rejects a deposit above the Kreditbetrag', () => {
    assert.deepEqual(rules([tx('DEPOSIT', '2024-01-01', 1000), tx('DEPOSIT', '2024-02-01', 1)]), ['CAP_EXCEEDED']);
  });

  it('allows depositing again after a withdrawal (#207)', () => {
    assert.deepEqual(
      rules([tx('DEPOSIT', '2024-01-01', 1000), tx('WITHDRAWAL', '2024-03-01', 400), tx('DEPOSIT', '2024-04-01', 400)]),
      [],
    );
    assert.deepEqual(
      rules([tx('DEPOSIT', '2024-01-01', 1000), tx('WITHDRAWAL', '2024-03-01', 400), tx('DEPOSIT', '2024-04-01', 401)]),
      ['CAP_EXCEEDED'],
    );
  });

  it('rejects a partial withdrawal that leaves 1 € or less, accepts one that leaves more', () => {
    assert.deepEqual(rules([tx('DEPOSIT', '2024-01-01', 1000), tx('WITHDRAWAL', '2024-02-01', 999.5)]), [
      'PARTIAL_TOO_LARGE',
    ]);
    assert.deepEqual(rules([tx('DEPOSIT', '2024-01-01', 1000), tx('WITHDRAWAL', '2024-02-01', 998.99)]), []);
  });

  it('rejects a withdrawal above the Kontostand', () => {
    assert.deepEqual(rules([tx('DEPOSIT', '2024-01-01', 500), tx('WITHDRAWAL', '2024-02-01', 600)]), [
      'BALANCE_NEGATIVE',
    ]);
  });

  it('orders a same-day deposit before a withdrawal whatever the ids say', () => {
    const list = [
      tx('WITHDRAWAL', '2024-02-01', 300, 'a'),
      tx('DEPOSIT', '2024-02-01', 500, 'b'),
      tx('DEPOSIT', '2024-01-01', 200, 'c'),
    ];
    assert.deepEqual(rules(list), []);
  });

  it('allows a Zinsauszahlung up to the accrued interest only', () => {
    const l = loan({ interestRate: 2 });
    const base = [tx('DEPOSIT', '2023-01-01', 1000)];
    assert.deepEqual(rules([...base, tx('INTERESTPAYMENT', '2023-12-31', 5)], l), []);
    assert.deepEqual(rules([...base, tx('INTERESTPAYMENT', '2023-12-31', 500)], l), ['INTEREST_EXCEEDS_ACCRUED']);
  });

  it('rejects every Zahlung after a closing Zahlung', () => {
    const closed = [tx('DEPOSIT', '2024-01-01', 1000), tx('TERMINATION', '2024-06-01', 1000)];
    assert.deepEqual(rules([...closed, tx('DEPOSIT', '2024-07-01', 1000)]), ['AFTER_CLOSING']);
    assert.deepEqual(rules([...closed, tx('WITHDRAWAL', '2024-07-01', 100)]), ['AFTER_CLOSING']);
    assert.deepEqual(rules([...closed, tx('NOTRECLAIMED', '2024-07-01', 100)]), ['AFTER_CLOSING']);
  });

  it('flags a closing Zahlung without a Kontostand', () => {
    assert.deepEqual(rules([tx('TERMINATION', '2024-06-01', 100)]), ['NOTHING_TO_CLOSE']);
  });
});

describe('closing differences', () => {
  it('is zero for a matching Rückzahlung', () => {
    const result = replayLedger(loan(), [tx('DEPOSIT', '2024-01-01', 1000), tx('TERMINATION', '2024-06-01', 1000)]);
    assert.equal(result.closingDifferences[0]?.difference, 0);
  });

  it('is negative when a deposit is backdated before the Rückzahlung, and that change is rejected', () => {
    const existing = [tx('DEPOSIT', '2023-01-01', 500), tx('TERMINATION', '2023-06-01', 500)];
    const proposed = [...existing, tx('DEPOSIT', '2023-02-01', 100)];
    const result = checkChange(loan(), existing, proposed);
    assert.deepEqual(
      result.errors.map((e) => e.rule),
      ['CLOSING_CHANGED'],
    );
    assert.equal(result.after.closingDifferences[0]?.difference, -100);
  });
});

describe('stateAt', () => {
  it('reports Kontostand and Einlagenstand at the end of a day', () => {
    const list = [tx('DEPOSIT', '2024-01-01', 1000), tx('WITHDRAWAL', '2024-03-01', 400)];
    assert.deepEqual(stateAt(loan(), list, day('2024-02-01')), { balance: 1000, einlagenstand: 1000 });
    assert.deepEqual(stateAt(loan(), list, day('2024-03-01')), { balance: 600, einlagenstand: 600 });
  });
});

describe('previewTransaction', () => {
  const base = [tx('DEPOSIT', '2024-01-01', 1000), tx('WITHDRAWAL', '2024-03-01', 400)];
  const preview = (transactions: Transaction[], draft: Parameters<typeof previewTransaction>[0]['draft']) =>
    previewTransaction({ loan: loan(), loanId: 'loan', transactions, draft, now: day('2024-06-01') });

  it('enables Einzahlung after a withdrawal with the freed capacity as maximum', () => {
    const result = preview(base, { date: day('2024-04-01'), type: TransactionType.DEPOSIT });
    assert.equal(result.types.DEPOSIT?.available, true);
    assert.equal(result.limits?.max, 400);
  });

  it('disables Einzahlung on a day with no free capacity and names the rule', () => {
    const result = preview(base, { date: day('2024-02-01') });
    assert.equal(result.types.DEPOSIT?.available, false);
    assert.equal(result.types.DEPOSIT?.reason?.rule, 'CAP_EXCEEDED');
  });

  it('limits a backdated withdrawal by a later withdrawal', () => {
    const list = [tx('DEPOSIT', '2024-01-01', 1000), tx('WITHDRAWAL', '2024-03-01', 800)];
    const result = preview(list, { date: day('2024-02-01'), type: TransactionType.WITHDRAWAL });
    assert.equal(result.limits?.max, 198.99);
    assert.equal(result.limits?.binding?.rule, 'PARTIAL_TOO_LARGE');
    assert.equal(result.limits?.binding?.date.getTime(), day('2024-03-01').getTime());
  });

  it('offers no type after a Rückzahlung and names the reason', () => {
    const closed = [tx('DEPOSIT', '2024-01-01', 1000), tx('TERMINATION', '2024-03-01', 1000)];
    const result = preview(closed, { date: day('2024-05-01') });
    for (const availability of Object.values(result.types)) {
      assert.equal(availability.available, false);
      assert.equal(availability.reason?.rule, 'AFTER_CLOSING');
    }
  });

  it('blocks a payment before a Rückzahlung: a closed Kredit is frozen', () => {
    const closed = [tx('DEPOSIT', '2024-01-01', 1000), tx('TERMINATION', '2024-03-01', 1000, 'closing')];
    const result = preview(closed, { date: day('2024-02-01'), type: TransactionType.WITHDRAWAL, amount: 100 });
    assert.equal(result.types.WITHDRAWAL?.available, false);
    assert.equal(result.types.WITHDRAWAL?.reason?.rule, 'CLOSING_CHANGED');
    assert.deepEqual(
      result.errors.map((e) => e.rule),
      ['CLOSING_CHANGED'],
    );
  });

  it('offers no type on the day of a Rückzahlung either: a new Zahlung is booked after it', () => {
    const closed = [tx('DEPOSIT', '2024-01-01', 1000), tx('TERMINATION', '2024-03-01', 1000)];
    const result = preview(closed, { date: day('2024-03-01') });
    assert.deepEqual(result.summary, { balance: 0, einlagenstand: 0 });
    assert.deepEqual(
      Object.entries(result.types)
        .filter(([, availability]) => availability.available)
        .map(([type]) => type),
      [],
    );
  });

  it('proposes the recalculated amount when the date of a Rückzahlung moves', () => {
    const l = loan({ interestRate: 2 });
    const list = [tx('DEPOSIT', '2024-01-01', 1000), tx('TERMINATION', '2024-03-01', 1003.3, 'closing')];
    const result = previewTransaction({
      loan: l,
      loanId: 'loan',
      transactions: list,
      draft: { transactionId: 'closing', date: day('2024-12-31'), type: TransactionType.TERMINATION, amount: 1003.3 },
      now: day('2025-06-01'),
    });
    assert.ok((result.closingAmount ?? 0) > 1003.3);
    const warning = result.warnings.find((w) => w.kind === 'CLOSING_DIFFERENCE');
    assert.ok(warning?.kind === 'CLOSING_DIFFERENCE' && warning.difference.difference < 0);
    assert.deepEqual(result.errors, []);
  });

  it('always shows the difference of the Rückzahlung being edited, even when it is unchanged', () => {
    const l = loan({ interestRate: 2 });
    const list = [tx('DEPOSIT', '2024-01-01', 1000), tx('TERMINATION', '2024-12-31', 1000, 'closing')];
    const result = previewTransaction({
      loan: l,
      loanId: 'loan',
      transactions: list,
      draft: { transactionId: 'closing', date: day('2024-12-31'), type: TransactionType.TERMINATION, amount: 1000 },
      now: day('2025-06-01'),
    });
    const warning = result.warnings.find((w) => w.kind === 'CLOSING_DIFFERENCE');
    assert.ok(warning?.kind === 'CLOSING_DIFFERENCE' && warning.difference.difference < 0);
  });

  it('blocks moving a Rückzahlung before a later withdrawal', () => {
    const list = [
      tx('DEPOSIT', '2024-01-01', 1000),
      tx('WITHDRAWAL', '2024-02-01', 300),
      tx('TERMINATION', '2024-03-01', 700, 'closing'),
    ];
    const result = preview(list, {
      transactionId: 'closing',
      date: day('2024-01-15'),
      type: TransactionType.TERMINATION,
      amount: 700,
    });
    assert.deepEqual(
      result.errors.map((e) => e.rule),
      ['AFTER_CLOSING'],
    );
  });

  it('warns about future dates without blocking', () => {
    const result = preview(base, { date: day('2024-09-01'), type: TransactionType.DEPOSIT, amount: 100 });
    assert.ok(result.warnings.some((w) => w.kind === 'FUTURE_DATE'));
    assert.deepEqual(result.errors, []);
  });

  it('blocks only new violations on a Kredit that already has some', () => {
    const broken = [tx('DEPOSIT', '2024-01-01', 1000), tx('DEPOSIT', '2024-02-01', 500, 'over')];
    const result = preview(broken, { date: day('2024-04-01'), type: TransactionType.WITHDRAWAL, amount: 100 });
    assert.deepEqual(result.errors, []);
    assert.ok(result.warnings.some((w) => w.kind === 'EXISTING_VIOLATIONS'));
  });
});

describe('a closed Kredit is frozen', () => {
  // 1.000 € deposited, 300 € partial withdrawal, Rückzahlung of the remaining 700 €
  const stored = [
    tx('DEPOSIT', '2024-01-01', 1000, 'dep'),
    tx('WITHDRAWAL', '2024-03-01', 300, 'wd'),
    tx('TERMINATION', '2024-06-01', 700, 'term'),
  ];
  const errorsOf = (proposed: Transaction[], exemptTransactionId?: string) =>
    checkChange(loan(), stored, proposed, day('2024-01-01'), { exemptTransactionId }).errors.map((e) => e.rule);

  it('rejects deleting the partial withdrawal before the Rückzahlung', () => {
    assert.deepEqual(errorsOf(stored.filter((t) => t.id !== 'wd')), ['CLOSING_CHANGED']);
  });

  it('rejects changing the amount of the partial withdrawal', () => {
    assert.deepEqual(errorsOf(stored.map((t) => (t.id === 'wd' ? { ...t, amount: -100 } : t))), ['CLOSING_CHANGED']);
  });

  it('rejects a backdated payment before the Rückzahlung', () => {
    assert.deepEqual(errorsOf([...stored, tx('WITHDRAWAL', '2024-02-01', 50)]), ['CLOSING_CHANGED']);
    assert.deepEqual(errorsOf([...stored, tx('DEPOSIT', '2024-04-01', 50)]), ['CLOSING_CHANGED']);
  });

  it('rejects moving a payment when interest makes the Rückzahlung stale', () => {
    const l = loan({ interestRate: 2 });
    const withInterest = [
      tx('DEPOSIT', '2024-01-01', 1000, 'dep'),
      tx('WITHDRAWAL', '2024-03-01', 300, 'wd'),
      tx('TERMINATION', '2024-12-31', 700 + 12, 'term'),
    ];
    const moved = withInterest.map((t) => (t.id === 'wd' ? { ...t, date: day('2024-09-01') } : t));
    const result = checkChange(l, withInterest, moved, day('2024-01-01'));
    assert.deepEqual(
      result.errors.map((e) => e.rule),
      ['CLOSING_CHANGED'],
    );
  });

  it('allows the Rückzahlung itself to change, and deleting it', () => {
    const edited = stored.map((t) => (t.id === 'term' ? { ...t, date: day('2024-07-01') } : t));
    assert.deepEqual(errorsOf(edited, 'term'), []);
    assert.deepEqual(errorsOf(stored.filter((t) => t.id !== 'term')), []);
  });

  it('allows deleting the Rückzahlung first and then fixing the payment', () => {
    const reopened = stored.filter((t) => t.id !== 'term');
    const fixed = reopened.map((t) => (t.id === 'wd' ? { ...t, amount: -100 } : t));
    const result = checkChange(loan(), reopened, fixed, day('2024-01-01'));
    assert.deepEqual(result.errors, []);
  });

  it('does not touch a legacy Rückzahlung whose difference stays the same', () => {
    const legacy = [tx('DEPOSIT', '2024-01-01', 1000, 'dep'), tx('TERMINATION', '2024-06-01', 990, 'term')];
    const changedElsewhere = [...legacy, tx('DEPOSIT', '2024-07-01', 10)];
    const result = checkChange(loan(), legacy, changedElsewhere, day('2024-07-01'));
    assert.deepEqual(
      result.errors.map((e) => e.rule),
      ['AFTER_CLOSING'],
    );
  });
});

describe('changedPastYears', () => {
  it('lists earlier years whose interest changes when a transaction moves into this year', () => {
    const l = loan({ interestRate: 2 });
    const before = [tx('DEPOSIT', '2023-03-01', 1000, 'd')];
    const after = [tx('DEPOSIT', '2024-03-01', 1000, 'd')];
    const years = changedPastYears(l, before, after, day('2024-06-01'));
    assert.deepEqual(
      years.map((y) => y.year),
      [2023],
    );
    assert.ok((years[0]?.interestBefore ?? 0) > 0);
    assert.equal(years[0]?.interestAfter, 0);
  });

  it('is empty when only the current year changes', () => {
    const before = [tx('DEPOSIT', '2024-02-01', 1000, 'd')];
    const after = [tx('DEPOSIT', '2024-03-01', 1000, 'd')];
    assert.deepEqual(changedPastYears(loan({ interestRate: 2 }), before, after, day('2024-06-01')), []);
  });
});
