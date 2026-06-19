import type { Transaction } from '@prisma/client';

import { transactionSorter } from '@/lib/utils/sorters';
import type { LoanWithCalculations } from '@/types/loans';
import type { TransactionListItem } from '@/types/transactions';

export type CalculatedLoanWithTransactions = LoanWithCalculations & {
  transactions: Transaction[];
};

export function buildTransactionListItemsFromLoans(
  loans: CalculatedLoanWithTransactions[],
): TransactionListItem[] {
  const rows: TransactionListItem[] = [];

  for (const loan of loans) {
    for (const transaction of loan.transactions) {
      rows.push({
        ...transaction,
        loan,
      });
    }
  }

  return [...rows].sort((a, b) => transactionSorter(b, a));
}

/** Stable table row id — virtual interest ids like `2026-interest` are only unique per loan. */
export function getTransactionListItemRowId(row: TransactionListItem): string {
  return `${row.loan.id}:${row.id}`;
}

export function getTransactionIdFromListItemRowId(rowId: string): string {
  const separator = rowId.indexOf(':');
  if (separator === -1) {
    return rowId;
  }
  return rowId.slice(separator + 1);
}
