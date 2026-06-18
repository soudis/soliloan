'use server';

import type { Transaction } from '@prisma/client';
import { auth } from '@/lib/auth';
import { calculateLenderFields } from '@/lib/calculations/lender-calculations';
import { calculateLoanFields, calculateLoanPerMonth } from '@/lib/calculations/loan-calculations';
import {
  buildCumulativeTimeline,
  type CumulativeTimelineEntry,
} from '@/lib/dashboard/history-table/cumulative-timeline';
import { db } from '@/lib/db';
import { sanitizeLender } from '@/lib/sanitation/sanitize-lender';
import { sanitizeLoan } from '@/lib/sanitation/sanitize-loan';
import { parseAdditionalFields } from '@/lib/utils/additional-fields';
import { assertCanManageProject } from '@/lib/views/access';
import type { LoanMonthlyHistory, LoanMonthlyNumbers } from '@/types/dashboard';
import type { LenderWithCalculations } from '@/types/lenders';
import type { LoanWithCalculations } from '@/types/loans';

export type DashboardLender = LenderWithCalculations;

export type DashboardLoan = LoanWithCalculations & {
  history: LoanMonthlyHistory;
  /** Prefix cumulative totals per month — built server-side for O(log H) client lookups. */
  cumulativeTimeline?: CumulativeTimelineEntry[];
  transactions: Transaction[];
};

function buildLoanMonthlyHistory(perMonth: ReturnType<typeof calculateLoanPerMonth>): LoanMonthlyHistory {
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
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    try {
      await assertCanManageProject(projectId, session.user.id, session.user.isAdmin ?? false);
    } catch {
      return { error: 'You do not have access to this project' };
    }

    // Single source query: every project loan is reachable through its lender, so we
    // avoid a second overlapping loan fetch. Notes/files are not used anywhere on the
    // dashboard, so we don't join them (the shared calc helpers get empty arrays).
    const lenders = await db.lender.findMany({
      where: { projectId },
      orderBy: { lenderNumber: 'asc' },
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

    const dashboardLoans: DashboardLoan[] = [];
    const dashboardLenders: DashboardLender[] = [];

    for (const lender of lenders) {
      const { loans: lenderLoans, ...lenderRest } = lender;
      const calculatedLender = calculateLenderFields(
        parseAdditionalFields({
          ...lender,
          notes: [],
          files: [],
          loans: lender.loans.map((loan) => parseAdditionalFields({ ...loan, notes: [], files: [] })),
        }),
        { toDate },
      );
      const sanitizedLender = sanitizeLender(calculatedLender);
      dashboardLenders.push(sanitizedLender);

      const lenderWithAggregates = {
        ...parseAdditionalFields({ ...lenderRest, notes: [], files: [] }),
        amount: sanitizedLender.amount,
        balance: sanitizedLender.balance,
        deposits: sanitizedLender.deposits,
        withdrawals: sanitizedLender.withdrawals,
        notReclaimed: sanitizedLender.notReclaimed,
        interest: sanitizedLender.interest,
        interestPaid: sanitizedLender.interestPaid,
      };

      for (const loan of lenderLoans) {
        const parsedLoan = parseAdditionalFields({
          ...loan,
          notes: [],
          files: [],
          lender: lenderWithAggregates,
        });
        const calculated = calculateLoanFields(parsedLoan, { toDate });
        const sanitized = sanitizeLoan(calculated);
        const perMonth = calculateLoanPerMonth(parsedLoan, toDate);
        const history = buildLoanMonthlyHistory(perMonth);
        const cumulativeTimeline = buildCumulativeTimeline(history);

        dashboardLoans.push({
          ...sanitized,
          history,
          cumulativeTimeline,
          transactions: parsedLoan.transactions,
        });
      }
    }
    dashboardLoans.sort((a, b) => new Date(b.signDate).getTime() - new Date(a.signDate).getTime());

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
