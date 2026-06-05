'use server';

import { calculateLenderFields } from '@/lib/calculations/lender-calculations';
import { calculateLoanFields, calculateLoanPerMonth } from '@/lib/calculations/loan-calculations';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  lenderFilesRelation,
  lenderNotesRelation,
  loanFilesRelation,
  loanNotesRelation,
} from '@/lib/prisma/notes-files-relations';
import { sanitizeLender } from '@/lib/sanitation/sanitize-lender';
import { sanitizeLoan } from '@/lib/sanitation/sanitize-loan';
import { parseAdditionalFields } from '@/lib/utils/additional-fields';
import { buildCumulativeTimeline, type CumulativeTimelineEntry } from '@/lib/dashboard/history-table/cumulative-timeline';
import type { LoanMonthlyHistory, LoanMonthlyNumbers } from '@/types/dashboard';
import type { LenderWithCalculations } from '@/types/lenders';
import type { Transaction } from '@prisma/client';
import type { LoanWithCalculations } from '@/types/loans';

export type DashboardLender = LenderWithCalculations;

export type DashboardLoan = LoanWithCalculations & {
  history: LoanMonthlyHistory;
  /** Prefix cumulative totals per month — built server-side for O(log H) client lookups. */
  cumulativeTimeline?: CumulativeTimelineEntry[];
  transactions: Transaction[];
};

function buildLoanMonthlyHistory(
  perMonth: ReturnType<typeof calculateLoanPerMonth>,
): LoanMonthlyHistory {
  const history: LoanMonthlyHistory = {};

  for (const entry of perMonth) {
    const numbers: LoanMonthlyNumbers = {
      begin: entry.begin.toNumber(),
      end: entry.end.toNumber(),
      withdrawals: entry.withdrawals.toNumber(),
      deposits: entry.deposits.toNumber(),
      notReclaimed: entry.notReclaimed.toNumber(),
      interestPaid: entry.interestPaid.toNumber(),
      interest: entry.interest.toNumber(),
      interestError: entry.interestError.toNumber(),
    };

    if (!history[entry.year]) {
      history[entry.year] = {};
    }
    history[entry.year][entry.month] = numbers;
  }

  return history;
}

export async function getDashboardStats(projectId: string, toDate: Date = new Date()) {
  try {
    const session = await auth();
    if (!session) {
      return { error: 'Unauthorized' };
    }

    const project = await db.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        managers: true,
      },
    });

    if (!project) {
      return { error: 'Project not found' };
    }

    const hasAccess = project.managers.some((manager) => manager.id === session.user.id);

    if (!hasAccess) {
      return { error: 'You do not have access to this project' };
    }

    const [loans, lenders] = await Promise.all([
      db.loan.findMany({
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
    }),
      db.lender.findMany({
        where: { projectId },
        orderBy: { lenderNumber: 'asc' },
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
      }),
    ]);

    const dashboardLoans: DashboardLoan[] = loans.map((loan) => {
      const parsedLoan = parseAdditionalFields({
        ...loan,
        lender: parseAdditionalFields(loan.lender),
      });
      const calculated = calculateLoanFields(parsedLoan, { toDate });
      const sanitized = sanitizeLoan(calculated);
      const perMonth = calculateLoanPerMonth(parsedLoan, toDate);
      const history = buildLoanMonthlyHistory(perMonth);
      const cumulativeTimeline = buildCumulativeTimeline(history);

      return {
        ...sanitized,
        history,
        cumulativeTimeline,
        transactions: parsedLoan.transactions,
      };
    });

    const dashboardLenders: DashboardLender[] = lenders.map((lender) =>
      sanitizeLender(
        calculateLenderFields(
          parseAdditionalFields({
            ...lender,
            loans: lender.loans.map((loan) => parseAdditionalFields(loan)),
          }),
        ),
      ),
    );

    return {
      toDate: toDate.toISOString(),
      loans: dashboardLoans,
      lenders: dashboardLenders,
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return { error: 'Failed to get dashboard stats' };
  }
}
