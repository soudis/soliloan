import type { Transaction } from '@prisma/client';

import type { LoanWithCalculations } from '@/types/loans';

export type TransactionListItem = Transaction & {
  loan: LoanWithCalculations & {
    transactions: Transaction[];
  };
};
