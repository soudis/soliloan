import { type Transaction, TransactionType } from '@prisma/client';

export const transactionSorter = (a: Transaction, b: Transaction) => {
  if (a.date > b.date) return 1;
  if (b.date > a.date) return -1;
  if (a.type === TransactionType.TERMINATION) return 1;
  if (b.type === TransactionType.TERMINATION) return -1;
  if (a.type === TransactionType.DEPOSIT) return -1;
  if (b.type === TransactionType.DEPOSIT) return 1;
  return 0;
};

export const loansSorter = <T extends { signDate: Date }>(a: T, b: T) => {
  const score = b.signDate.getTime() - a.signDate.getTime();
  return score;
};
