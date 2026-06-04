'use server';
import { calculateLenderFields } from '@/lib/calculations/lender-calculations';
import { db } from '@/lib/db';
import {
  lenderFilesRelation,
  lenderNotesRelation,
  loanFilesRelation,
  loanNotesRelation,
} from '@/lib/prisma/notes-files-relations';
import { sanitizeLender } from '@/lib/sanitation/sanitize-lender';
import { projectIdSchema } from '@/lib/schemas/common';
import { parseAdditionalFields } from '@/lib/utils/additional-fields';
import { projectAction } from '@/lib/utils/safe-action';

export async function getLendersByProjectIdUnsafe(projectId: string) {
  try {
    const lenders = await db.lender.findMany({
      where: {
        projectId,
      },
      orderBy: {
        lenderNumber: 'asc',
      },
      include: {
        loans: {
          include: {
            transactions: true,
            notes: loanNotesRelation,
            files: loanFilesRelation,
          },
        },
        notes: lenderNotesRelation,
        files: lenderFilesRelation,
        user: {
          select: {
            name: true,
            id: true,
            email: true,
            lastLogin: true,
            lastInvited: true,
          },
        },
        project: {
          include: {
            configuration: { select: { interestMethod: true } },
          },
        },
      },
    });

    // Calculate virtual fields for each lender
    const lendersWithCalculations = lenders.map((lender) =>
      sanitizeLender(
        calculateLenderFields(
          parseAdditionalFields({ ...lender, loans: lender.loans.map((loan) => parseAdditionalFields(loan)) }),
        ),
      ),
    );

    return { lenders: lendersWithCalculations };
  } catch (error) {
    console.error('Error fetching lenders:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch lenders',
    };
  }
}

export const getLendersByProjectAction = projectAction
  .inputSchema(projectIdSchema)
  .action(async ({ parsedInput: { projectId } }) => {
    return getLendersByProjectIdUnsafe(projectId);
  });
