import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { TransactionType } from '@prisma/client';

import { sortRowsForBooking } from './import-order';

const row = (id: string, bookingDate: string, amount: number, selectedType: TransactionType | null = null) => ({
  id,
  bookingDate: new Date(bookingDate),
  amount,
  selectedType,
});

const ids = (rows: ReturnType<typeof row>[]) => sortRowsForBooking(rows).map((item) => item.id);

describe('sortRowsForBooking', () => {
  it('books the oldest row first, whatever order they were selected in', () => {
    const selected = [
      row('repayment', '2025-06-01', -1000, 'TERMINATION'),
      row('deposit', '2025-01-01', 1000),
      row('partial', '2025-03-01', -100, 'WITHDRAWAL'),
    ];
    assert.deepEqual(ids(selected), ['deposit', 'partial', 'repayment']);
  });

  it('books Einzahlungen first and a Rückzahlung last within a day', () => {
    const selected = [
      row('a-repayment', '2025-03-14', -900, 'TERMINATION'),
      row('b-partial', '2025-03-14', -100, 'WITHDRAWAL'),
      row('c-deposit', '2025-03-14', 1000),
    ];
    assert.deepEqual(ids(selected), ['c-deposit', 'b-partial', 'a-repayment']);
  });

  it('does not change the input', () => {
    const selected = [row('b', '2025-02-01', 1), row('a', '2025-01-01', 1)];
    sortRowsForBooking(selected);
    assert.deepEqual(
      selected.map((item) => item.id),
      ['b', 'a'],
    );
  });
});
