import { TransactionType } from '@prisma/client';

import {
  isTransactionInTimeRange,
  resolveTimeRangeBounds,
  type TransactionTimeRangeBounds,
  type TransactionTimeRangePreset,
} from '@/lib/transactions/transaction-time-range';
import type { TransactionListItem } from '@/types/transactions';

export function filterByTimeRange(
  rows: TransactionListItem[],
  bounds: TransactionTimeRangeBounds,
): TransactionListItem[] {
  return rows.filter((row) => isTransactionInTimeRange(new Date(row.date), bounds));
}

export function filterByInterest(rows: TransactionListItem[], includeInterest: boolean): TransactionListItem[] {
  if (includeInterest) {
    return rows;
  }
  return rows.filter((row) => row.type !== TransactionType.INTEREST);
}

export function applyTransactionTableFilters(
  rows: TransactionListItem[],
  options: {
    txRange: TransactionTimeRangePreset;
    txRangeFrom?: string | null;
    txRangeTo?: string | null;
    includeInterest: boolean;
  },
): TransactionListItem[] {
  const bounds = resolveTimeRangeBounds(options.txRange, options.txRangeFrom, options.txRangeTo);
  return filterByInterest(filterByTimeRange(rows, bounds), options.includeInterest);
}

export function isTransactionDeletable(row: TransactionListItem): boolean {
  if (row.type === TransactionType.INTEREST) {
    return false;
  }
  const loanTransactions = row.loan.transactions ?? [];
  const lastNonInterest = [...loanTransactions].reverse().find((tx) => tx.type !== TransactionType.INTEREST);
  return lastNonInterest?.id === row.id;
}
