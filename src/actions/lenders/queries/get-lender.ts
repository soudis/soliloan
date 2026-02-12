'use server';

import { auth } from '@/lib/auth';
import { calculateLenderFields } from '@/lib/calculations/lender-calculations';
import { db } from '@/lib/db';
import { lenderIdSchema } from '@/lib/schemas/common';
import { parseAdditionalFields } from '@/lib/utils/additional-fields';
import { lenderAction } from '@/lib/utils/safe-action';

// Define the type for the lender with included relations

async function getLenderById(lenderId: string) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    // Fetch the lender
    const lender = await db.lender.findUnique({
      where: {
        id: lenderId,
      },
      include: {
        project: {
          include: {
            configuration: { select: { interestMethod: true } },
          },
        },
        loans: {
          include: {
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
        notes: { include: { createdBy: { select: { id: true, name: true } } } },
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

    if (!lender) {
      throw new Error('Lender not found');
    }

    // Calculate virtual fields
    const lenderWithCalculations = calculateLenderFields(
      parseAdditionalFields({ ...lender, loans: lender.loans.map((loan) => parseAdditionalFields(loan)) }),
    );

    return { lender: lenderWithCalculations };
  } catch (error) {
    console.error('Error fetching lender:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch lender',
    };
  }
}

export const getLenderAction = lenderAction
  .inputSchema(lenderIdSchema)
  .action(async ({ parsedInput: { lenderId } }) => {
    return getLenderById(lenderId);
  });
