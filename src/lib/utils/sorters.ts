import { type Transaction, TransactionType } from '@prisma/client';
import moment from 'moment';

import { isClosingType } from '@/lib/transactions/closing-types';
import { LoanStatus } from '@/types/loans';

type SortableTransaction = Pick<Transaction, 'id' | 'type' | 'date'> & { loanId?: string };

const sameDayRank = (transaction: SortableTransaction) => {
  if (transaction.type === TransactionType.DEPOSIT) return 0;
  if (isClosingType(transaction.type)) return 2;
  return 1;
};

/**
 * Oldest first, by calendar day (Europe/Berlin in production, like the validator's `toLedger`): the
 * time of day only reflects where a Zahlung came from (the form stores local midnight, the bank
 * import UTC midnight), not when it happened. On the same day Einzahlungen come first, then the
 * other types, and a closing Zahlung (Rückzahlung / Erlassung) last. A Zahlung that was created after
 * a closing Zahlung of the same Kredit and day (its id sorts after) comes after it, so a new
 * Einzahlung on the day of a Rückzahlung is booked after the repayment. Works on a list because that
 * order depends on the closing Zahlung of the same day.
 */
export const sortTransactions = <T extends SortableTransaction>(transactions: T[]): T[] => {
  const days = new Map<T, number>(
    transactions.map((transaction) => [transaction, moment(transaction.date).startOf('day').valueOf()]),
  );
  const dayOf = (transaction: T) => days.get(transaction) ?? 0;
  const dayKey = (transaction: T) => `${transaction.loanId ?? ''}|${dayOf(transaction)}`;
  const firstClosingId = new Map<string, string>();
  for (const transaction of transactions) {
    if (!isClosingType(transaction.type)) continue;
    const key = dayKey(transaction);
    const current = firstClosingId.get(key);
    if (current === undefined || transaction.id < current) {
      firstClosingId.set(key, transaction.id);
    }
  }
  const createdAfterClosing = (transaction: T) => {
    // synthetic interest rows are booked with the closing Zahlung, never after it
    if (transaction.type === TransactionType.INTEREST) return 0;
    const closingId = firstClosingId.get(dayKey(transaction));
    return closingId !== undefined && transaction.id > closingId ? 1 : 0;
  };
  return [...transactions].sort((a, b) => {
    const day = dayOf(a) - dayOf(b);
    if (day !== 0) return day;
    const late = createdAfterClosing(a) - createdAfterClosing(b);
    if (late !== 0) return late;
    const rank = sameDayRank(a) - sameDayRank(b);
    if (rank !== 0) return rank;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
};

export const createdAtDescSorter = <T extends { createdAt: Date }>(a: T, b: T) =>
  b.createdAt.getTime() - a.createdAt.getTime();

export const loansSorter = <T extends { signDate: Date; status: LoanStatus | string }>(a: T, b: T) => {
  const aRepaid = a.status === LoanStatus.REPAID;
  const bRepaid = b.status === LoanStatus.REPAID;
  if (aRepaid !== bRepaid) {
    return aRepaid ? 1 : -1;
  }
  return b.signDate.getTime() - a.signDate.getTime();
};
