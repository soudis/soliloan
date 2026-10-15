import { TerminationType, TransactionType } from '@prisma/client';
import moment from 'moment';

import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import type { LoanWithRelations } from '@/types/loans';

import { isRepaid } from './loan-calculations';

type LoanWithTransactions = Pick<LoanWithRelations, 'transactions' | 'terminationType' | 'terminationDate'> & {
  firstDepositDate?: Date | null;
};

function asLoanWithRelations(loan: LoanWithTransactions): LoanWithRelations {
  return loan as LoanWithRelations;
}

export function getFirstDepositDateFromTransactions(
  transactions: { type: TransactionType; date: Date }[] | undefined,
): Date | null {
  if (!transactions?.length) {
    return null;
  }

  const deposits = transactions
    .filter((transaction) => transaction.type === TransactionType.DEPOSIT)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return deposits[0]?.date ?? null;
}

export function getFirstDepositDate(loan: LoanWithTransactions): Date | null {
  if (loan.firstDepositDate !== undefined) {
    return loan.firstDepositDate;
  }

  return getFirstDepositDateFromTransactions(loan.transactions);
}

export function hasFirstDepositOnOrBefore(loan: LoanWithTransactions, periodEnd: Date): boolean {
  const firstDeposit = getFirstDepositDate(loan);
  return firstDeposit != null && !moment(firstDeposit).isAfter(periodEnd, 'day');
}

type LoanTimelineSource = LoanWithTransactions & {
  signDate?: Date | string | null;
};

/** First deposit when one exists, otherwise the contract date. */
export function getLoanTimelineStart(loan: LoanTimelineSource): Date | null {
  const firstDeposit = getFirstDepositDate(loan);
  if (firstDeposit) {
    return firstDeposit;
  }
  if (!loan.signDate) {
    return null;
  }
  const signDate = loan.signDate instanceof Date ? loan.signDate : new Date(loan.signDate);
  return Number.isNaN(signDate.getTime()) ? null : signDate;
}

export function loanStartedOnOrBefore(loan: LoanTimelineSource, periodEnd: Date): boolean {
  const start = getLoanTimelineStart(loan);
  return start != null && !moment(start).isAfter(periodEnd, 'day');
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
