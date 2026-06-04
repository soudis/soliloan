'use server';

import type { Loan } from '@prisma/client';
import { z } from 'zod';
import { calculateLoanFields } from '@/lib/calculations/loan-calculations';
import { db } from '@/lib/db';
import {
  lenderFilesRelation,
  lenderNotesRelation,
  loanFilesRelation,
  loanNotesRelation,
} from '@/lib/prisma/notes-files-relations';
import { loanIdSchema } from '@/lib/schemas/common';
import { parseAdditionalFields } from '@/lib/utils/additional-fields';
import { loanAction } from '@/lib/utils/safe-action';
import type { LoanWithRelations } from '@/types/loans';

async function getLoanById(loanId: string, date?: Date) {
  try {
    // Fetch the loan
    const loan = await db.loan.findUnique({
      where: {
        id: loanId,
      },
      include: {
        lender: {
          include: {
            project: {
              include: {
                configuration: { select: { interestMethod: true } },
              },
            },
            notes: lenderNotesRelation,
            user: {
              select: {
                name: true,
                id: true,
                email: true,
                lastLogin: true,
                lastInvited: true,
              },
            },
            files: lenderFilesRelation,
          },
        },
        transactions: true,
        notes: loanNotesRelation,
        files: loanFilesRelation,
      },
    });

    if (!loan) {
      throw new Error('Loan not found');
    }

    // Calculate virtual fields
    // Ensure we pass the lender with parsed fields
    const loanWithCalculations = calculateLoanFields<Omit<LoanWithRelations, keyof Loan>>(
      parseAdditionalFields({ ...loan, lender: parseAdditionalFields(loan.lender) }),
      { toDate: date },
    );

    return { loan: loanWithCalculations };
  } catch (error) {
    console.error('Error fetching loan:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch loan',
    };
  }
}

export const getLoanAction = loanAction
  .inputSchema(loanIdSchema.extend({ date: z.coerce.date().nullish() }))
  .action(async ({ parsedInput: { loanId, date } }) => {
    return getLoanById(loanId, date ?? undefined);
  });
