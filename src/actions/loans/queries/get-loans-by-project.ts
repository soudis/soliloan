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
import { parseAdditionalFields } from '@/lib/utils/additional-fields';
import { projectAction } from '@/lib/utils/safe-action';

export async function getLoansByProjectUnsafe(projectId: string) {
  try {
    const loans = await db.loan.findMany({
      where: {
        lender: {
          projectId,
        },
      },
      orderBy: {
        signDate: 'desc',
      },
      include: {
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
      },
    });

    // Calculate virtual fields for each loan
    const loansWithCalculations = loans.map((loan) =>
      sanitizeLoan(calculateLoanFields(parseAdditionalFields({ ...loan, lender: parseAdditionalFields(loan.lender) }))),
    );

    return { loans: loansWithCalculations };
  } catch (error) {
    console.error('Error fetching loans:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch loans',
    };
  }
}

export const getLoansByProjectAction = projectAction.inputSchema(projectIdSchema).action(async ({ parsedInput }) => {
  return getLoansByProjectUnsafe(parsedInput.projectId);
});
