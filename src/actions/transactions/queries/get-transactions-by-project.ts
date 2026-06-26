'use server';

import { calculateLoanFields } from '@/lib/calculations/loan-calculations';
import { db } from '@/lib/db';
import {
  lenderFilesRelation,
  lenderNotesRelation,
  loanFilesRelation,
  loanNotesRelation,
} from '@/lib/prisma/notes-files-relations';
import { sanitizeLoan } from '@/lib/sanitation/sanitize-loan';
import { projectIdSchema } from '@/lib/schemas/common';
import {
  buildTransactionListItemsFromLoans,
  type CalculatedLoanWithTransactions,
} from '@/lib/transactions/build-transaction-list-items';
import { parseAdditionalFields } from '@/lib/utils/additional-fields';
import { projectAction } from '@/lib/utils/safe-action';

const loanInclude = {
  lender: {
    include: {
      project: {
        include: {
          configuration: { select: { interestMethod: true } },
        },
      },
      user: {
        select: {
          name: true,
          id: true,
          email: true,
          lastLogin: true,
          lastInvited: true,
        },
      },
      notes: lenderNotesRelation,
      files: lenderFilesRelation,
    },
  },
  transactions: true,
  notes: loanNotesRelation,
  files: loanFilesRelation,
} as const;

export async function getTransactionsByProjectUnsafe(projectId: string) {
  try {
    const loans = await db.loan.findMany({
      where: {
        lender: {
          projectId,
        },
      },
      include: loanInclude,
    });

    const calculatedLoans: CalculatedLoanWithTransactions[] = loans.map((loan) => {
      const parsedLoan = parseAdditionalFields({
        ...loan,
        lender: parseAdditionalFields(loan.lender),
      });
      const calculated = calculateLoanFields(parsedLoan);

      return {
        ...sanitizeLoan(calculated),
        transactions: calculated.transactions,
      };
    });

    return { transactions: buildTransactionListItemsFromLoans(calculatedLoans) };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch transactions',
    };
  }
}

export const getTransactionsByProjectAction = projectAction
  .inputSchema(projectIdSchema)
  .action(async ({ parsedInput }) => {
    return getTransactionsByProjectUnsafe(parsedInput.projectId);
  });
