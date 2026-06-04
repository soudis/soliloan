'use server';

import { calculateLoanFields, calculateLoanPerMonth } from '@/lib/calculations/loan-calculations';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  lenderFilesRelation,
  lenderNotesRelation,
  loanFilesRelation,
  loanNotesRelation,
} from '@/lib/prisma/notes-files-relations';
import { sanitizeLoan } from '@/lib/sanitation/sanitize-loan';
import { parseAdditionalFields } from '@/lib/utils/additional-fields';
import type { LoanMonthlyHistory, LoanMonthlyNumbers } from '@/types/dashboard';
import type { LoanWithCalculations } from '@/types/loans';

export type DashboardLoan = LoanWithCalculations & {
  history: LoanMonthlyHistory;
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

    const loans = await db.loan.findMany({
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
    });

    const dashboardLoans: DashboardLoan[] = loans.map((loan) => {
      const parsedLoan = parseAdditionalFields({
        ...loan,
        lender: parseAdditionalFields(loan.lender),
      });
      const calculated = calculateLoanFields(parsedLoan, { toDate });
      const sanitized = sanitizeLoan(calculated);
      const perMonth = calculateLoanPerMonth(parsedLoan, toDate);
      const history = buildLoanMonthlyHistory(perMonth);

      return {
        ...sanitized,
        history,
      };
    });

    return {
      toDate: toDate.toISOString(),
      loans: dashboardLoans,
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return { error: 'Failed to get dashboard stats' };
  }
}
