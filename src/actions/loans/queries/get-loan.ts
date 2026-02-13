'use server';

import type { Loan } from '@prisma/client';
import { z } from 'zod';
import { calculateLoanFields } from '@/lib/calculations/loan-calculations';
import { db } from '@/lib/db';
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
            notes: {
              include: { createdBy: { select: { id: true, name: true } } },
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
            files: {
              select: {
                id: true,
                name: true,
                description: true,
                public: true,
                mimeType: true,
                lenderId: true,
                loanId: true,
                thumbnail: true,
                createdAt: true,
                createdBy: { select: { id: true, name: true } },
                createdById: true,
              },
            },
          },
        },
        transactions: true,
        notes: {
          include: { createdBy: { select: { id: true, name: true } } },
        },
        files: {
          select: {
            id: true,
            name: true,
            description: true,
            public: true,
            mimeType: true,
            lenderId: true,
            loanId: true,
            thumbnail: true,
            createdAt: true,
            createdBy: { select: { id: true, name: true } },
            createdById: true,
          },
        },
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
