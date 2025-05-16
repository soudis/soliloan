'use server';

import { auth } from '@/lib/auth';
import { calculateLenderFields } from '@/lib/calculations/lender-calculations';
import { db } from '@/lib/db';

// Define the type for the lender with included relations

export async function getLenderById(lenderId: string) {
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
            managers: true,
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
          },
        },
      },
    });

    if (!lender) {
      throw new Error('Lender not found');
    }

    // Check if the user has access to the lender's project
    const hasAccess = lender.project.managers.some((manager) => manager.id === session.user.id);

    if (!hasAccess) {
      throw new Error('You do not have access to this lender');
    }

    // Calculate virtual fields
    const lenderWithCalculations = calculateLenderFields(lender);

    return { lender: lenderWithCalculations };
  } catch (error) {
    console.error('Error fetching lender:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch lender',
    };
  }
}
