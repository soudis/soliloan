'use server';
import { calculateLenderFields } from '@/lib/calculations/lender-calculations';
import { db } from '@/lib/db';

export async function getLendersByProjectId(projectId: string) {
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
              },
            },
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
    const lendersWithCalculations = lenders.map((lender) => calculateLenderFields(lender));

    return { lenders: lendersWithCalculations };
  } catch (error) {
    console.error('Error fetching lenders:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch lenders',
    };
  }
}
