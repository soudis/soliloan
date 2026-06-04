import { type Transaction, TransactionType } from '@prisma/client';

import { LoanStatus } from '@/types/loans';

export const transactionSorter = (a: Transaction, b: Transaction) => {
  if (a.date > b.date) return 1;
  if (b.date > a.date) return -1;
  if (a.type === TransactionType.TERMINATION) return 1;
  if (b.type === TransactionType.TERMINATION) return -1;
  if (a.type === TransactionType.DEPOSIT) return -1;
  if (b.type === TransactionType.DEPOSIT) return 1;
  return 0;
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
