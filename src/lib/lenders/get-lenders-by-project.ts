import 'server-only';

import { calculateLenderFields } from '@/lib/calculations/lender-calculations';
import { db } from '@/lib/db';
import { sanitizeLenderForList } from '@/lib/sanitation/sanitize-lender';
import { parseAdditionalFields } from '@/lib/utils/additional-fields';

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
        project: {
          include: {
            configuration: { select: { interestMethod: true } },
          },
        },
      },
    });

    // Calculate virtual fields for each lender
    const lendersWithCalculations = lenders.map((lender) =>
      sanitizeLenderForList(
        calculateLenderFields(
          parseAdditionalFields({
            ...lender,
            notes: [],
            files: [],
            loans: lender.loans.map((loan) => parseAdditionalFields({ ...loan, notes: [], files: [] })),
          }),
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
