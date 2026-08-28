import type { Transaction } from '@prisma/client';

import { aggregateLenderLoanSums, type calculateLenderFields } from '@/lib/calculations/lender-calculations';
import { calculateLoanFieldsWithPerYear, calculateLoanPerMonth } from '@/lib/calculations/loan-calculations';
import type { CumulativeTimelineEntry } from '@/lib/dashboard/history-table/cumulative-timeline';
import { db } from '@/lib/db';
import { sanitizeLenderForList } from '@/lib/sanitation/sanitize-lender';
import { sanitizeLoan } from '@/lib/sanitation/sanitize-loan';
import { parseAdditionalFields } from '@/lib/utils/additional-fields';
import type { LoanMonthlyHistory, LoanMonthlyNumbers } from '@/types/dashboard';
import type { LenderListItem } from '@/types/lenders';
import type { LoanWithCalculations } from '@/types/loans';

export type DashboardLender = LenderListItem;

export type DashboardLoan = LoanWithCalculations & {
  history: LoanMonthlyHistory;
  /** Prefix cumulative totals per month — rebuilt on the client when omitted. */
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

export async function loadDashboardStats(projectId: string, toDate: Date = new Date()) {
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
    const parsedLenderRest = parseAdditionalFields({ ...lenderRest, notes: [], files: [] });
    const calculatedLoans = [];
    const loanStartIndex = dashboardLoans.length;

    for (const loan of lenderLoans) {
      const parsedLoan = parseAdditionalFields({
        ...loan,
        notes: [],
        files: [],
        lender: parsedLenderRest,
      });
      const { calculated, perYear } = calculateLoanFieldsWithPerYear(parsedLoan, { toDate });
      const sanitized = sanitizeLoan(calculated);
      const perMonth = calculateLoanPerMonth(parsedLoan, toDate, undefined, perYear);
      const history = buildLoanMonthlyHistory(perMonth);

      calculatedLoans.push(calculated);
      dashboardLoans.push({
        ...sanitized,
        history,
        transactions: parsedLoan.transactions,
      });
    }

    const sums = aggregateLenderLoanSums(calculatedLoans);
    for (let index = loanStartIndex; index < dashboardLoans.length; index++) {
      const dashboardLoan = dashboardLoans[index];
      if (!dashboardLoan) {
        continue;
      }
      dashboardLoan.lender = { ...dashboardLoan.lender, ...sums };
    }
    dashboardLenders.push(
      sanitizeLenderForList({
        ...parsedLenderRest,
        notes: [],
        files: [],
        loans: [],
        allNotes: [],
        allFiles: [],
        ...sums,
      } as ReturnType<typeof calculateLenderFields>),
    );
  }

  dashboardLoans.sort((a, b) => new Date(b.signDate).getTime() - new Date(a.signDate).getTime());

  return {
    toDate: toDate.toISOString(),
    loans: dashboardLoans,
    lenders: dashboardLenders,
  };
}
