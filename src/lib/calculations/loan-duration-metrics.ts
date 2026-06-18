import { TerminationType, TransactionType } from '@prisma/client';
import moment from 'moment';

import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import type { LoanWithRelations } from '@/types/loans';

import { isRepaid } from './loan-calculations';

type LoanWithTransactions = Pick<LoanWithRelations, 'transactions' | 'terminationType' | 'terminationDate'>;

function asLoanWithRelations(loan: LoanWithTransactions): LoanWithRelations {
  return loan as LoanWithRelations;
}

export function getFirstDepositDate(loan: LoanWithTransactions): Date | null {
  const deposits = loan.transactions
    .filter((transaction) => transaction.type === TransactionType.DEPOSIT)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return deposits[0]?.date ?? null;
}

export function getLoanTermEndDate(loan: LoanWithTransactions, toDate: Date): Date {
  return isRepaid(asLoanWithRelations(loan), toDate) ?? toDate;
}

export function getLoanTermDays(loan: LoanWithTransactions, toDate: Date): number | null {
  const start = getFirstDepositDate(loan);
  if (!start) {
    return null;
  }

  const end = getLoanTermEndDate(loan, toDate);
  const days = moment(end).startOf('day').diff(moment(start).startOf('day'), 'days');
  return days >= 0 ? days : null;
}

export function getRepaymentPeriodDays(loan: LoanWithTransactions, toDate: Date): number | null {
  if (loan.terminationType !== TerminationType.TERMINATION || !loan.terminationDate) {
    return null;
  }

  const repaidDate = isRepaid(asLoanWithRelations(loan), toDate);
  if (!repaidDate) {
    return null;
  }

  const days = moment(repaidDate).startOf('day').diff(moment(loan.terminationDate).startOf('day'), 'days');
  return days >= 0 ? days : null;
}

export function getLoanTermDaysForDashboard(loan: DashboardLoan, toDate: Date): number | null {
  return getLoanTermDays(loan, toDate);
}

export function getRepaymentPeriodDaysForDashboard(loan: DashboardLoan, toDate: Date): number | null {
  return getRepaymentPeriodDays(loan, toDate);
}
