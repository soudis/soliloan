'use server';

import type { TransactionType } from '@prisma/client';

import { auth } from '@/lib/auth';
import { calculateLenderFields } from '@/lib/calculations/lender-calculations';
import { db } from '@/lib/db';
import { parseAdditionalFields } from '@/lib/utils/additional-fields';

const RECENT_ACTIVITY_LIMIT = 10;

export type LenderRecentActivity = {
  id: string;
  date: string;
  type: TransactionType;
  amount: number;
  loanId: string;
  loanNumber: number;
  projectId: string;
  projectName: string;
};

export type LendersByUserAggregates = {
  totalLoanCount: number;
  totalBalance: number;
  totalInterest: number;
  recentActivities: LenderRecentActivity[];
};

export async function getLendersByUser(): Promise<
  { lenders: ReturnType<typeof calculateLenderFields>[]; aggregates: LendersByUserAggregates } | { error: string }
> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    const lendersRaw = await db.lender.findMany({
      where: { user: { id: session.user.id } },
      orderBy: [{ projectId: 'asc' }, { lenderNumber: 'asc' }],
      include: {
        project: {
          include: {
            configuration: {
              select: {
                interestMethod: true,
                name: true,
                logo: true,
                loanAdditionalFields: true,
              },
            },
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
        user: {
          select: {
            name: true,
            id: true,
            email: true,
            lastLogin: true,
            lastInvited: true,
          },
        },
      },
    });

    const recentActivities: LenderRecentActivity[] = [];
    for (const lender of lendersRaw) {
      const projectName = lender.project.configuration.name;
      for (const loan of lender.loans) {
        for (const tx of loan.transactions) {
          if (tx.type === 'INTEREST') continue;
          recentActivities.push({
            id: tx.id,
            date: tx.date.toISOString(),
            type: tx.type,
            amount: tx.amount,
            loanId: loan.id,
            loanNumber: loan.loanNumber,
            projectId: lender.projectId,
            projectName,
          });
        }
      }
    }
    recentActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentActivitiesTrimmed = recentActivities.slice(0, RECENT_ACTIVITY_LIMIT);

    const lendersWithCalculations = lendersRaw.map((lender) =>
      calculateLenderFields(
        parseAdditionalFields({
          ...lender,
          loans: lender.loans.map((loan) => parseAdditionalFields({ ...loan, lender })),
        }),
        { client: true },
      ),
    );

    const allLoans = lendersWithCalculations.flatMap((l) => l.loans);

    const aggregates: LendersByUserAggregates = {
      totalLoanCount: allLoans.length,
      totalBalance: allLoans.reduce((s, l) => s + Number(l.balance), 0),
      totalInterest: allLoans.reduce((s, l) => s + Number(l.interest), 0),
      recentActivities: recentActivitiesTrimmed,
    };

    return { lenders: lendersWithCalculations, aggregates };
  } catch (error) {
    console.error('Error fetching lenders by user:', error);
    return { error: error instanceof Error ? error.message : 'Failed to fetch lenders' };
  }
}
