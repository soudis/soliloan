import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Transaction, TransactionType } from '@prisma/client';

import { sortTransactions } from './sorters';

const tx = (id: string, type: TransactionType, date: string, loanId = 'loan'): Transaction =>
  ({
    id,
    loanId,
    type,
    date: new Date(`${date}T00:00:00`),
    amount: 100,
    paymentType: 'BANK',
    lenderNotifiedAt: null,
  }) as Transaction;

const ids = (list: Transaction[]) => sortTransactions(list).map((item) => item.id);

describe('sortTransactions', () => {
  it('orders by date', () => {
    assert.deepEqual(ids([tx('b', 'DEPOSIT', '2024-02-01'), tx('a', 'DEPOSIT', '2024-01-01')]), ['a', 'b']);
  });

  it('puts Einzahlungen first and the closing Zahlung last on the same day', () => {
    const list = [
      tx('c3', 'TERMINATION', '2024-03-01'),
      tx('c2', 'WITHDRAWAL', '2024-03-01'),
      tx('c1', 'DEPOSIT', '2024-03-01'),
    ];
    assert.deepEqual(ids(list), ['c1', 'c2', 'c3']);
  });

  it('treats an Erlassung like a Rückzahlung', () => {
    assert.deepEqual(ids([tx('c2', 'NOTRECLAIMED', '2024-03-01'), tx('c1', 'WITHDRAWAL', '2024-03-01')]), ['c1', 'c2']);
  });

  it('books a Zahlung created after the closing Zahlung of the same day after it', () => {
    const list = [
      tx('c2', 'DEPOSIT', '2024-03-01'),
      tx('c1', 'TERMINATION', '2024-03-01'),
      tx('c0', 'DEPOSIT', '2024-03-01'),
    ];
    assert.deepEqual(ids(list), ['c0', 'c1', 'c2']);
  });

  it('does not mix Kredite on the same day', () => {
    const list = [
      tx('c1', 'TERMINATION', '2024-03-01', 'loan-a'),
      tx('c2', 'DEPOSIT', '2024-03-01', 'loan-b'),
      tx('c0', 'DEPOSIT', '2024-03-01', 'loan-a'),
    ];
    assert.deepEqual(
      sortTransactions(list)
        .filter((item) => item.loanId === 'loan-b')
        .map((item) => item.id),
      ['c2'],
    );
    assert.deepEqual(
      sortTransactions(list)
        .filter((item) => item.loanId === 'loan-a')
        .map((item) => item.id),
      ['c0', 'c1'],
    );
  });

  it('keeps a synthetic interest row before the closing Zahlung', () => {
    const list = [tx('c1', 'TERMINATION', '2024-03-01'), tx('2024-interest', 'INTEREST', '2024-03-01')];
    assert.deepEqual(ids(list), ['2024-interest', 'c1']);
  });

  it('does not change the input', () => {
    const list = [tx('b', 'DEPOSIT', '2024-02-01'), tx('a', 'DEPOSIT', '2024-01-01')];
    sortTransactions(list);
    assert.deepEqual(
      list.map((item) => item.id),
      ['b', 'a'],
    );
  });
});
