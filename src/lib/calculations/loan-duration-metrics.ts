import { type DurationType, TerminationType, TransactionType } from '@prisma/client';
import moment from 'moment';

import type { DashboardLoan } from '@/lib/dashboard/load-dashboard-stats';
import { formatCalendarDuration } from '@/lib/format-duration';
import { resolveContractEndDate } from '@/lib/loans/loan-end-date-sanity-check';
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

type TotalRuntimeLoan = {
  terminationType: TerminationType;
  signDate: Date | string;
  endDate?: Date | string | null;
  duration?: number | null;
  durationType?: DurationType | null;
};

export type TotalRuntime = {
  terminationType: TerminationType;
  days: number | null;
};

export function isTotalRuntime(value: unknown): value is TotalRuntime {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const candidate = value as { terminationType?: unknown; days?: unknown };
  return (
    typeof candidate.terminationType === 'string' &&
    (candidate.days === null || (typeof candidate.days === 'number' && Number.isFinite(candidate.days)))
  );
}

export function getContractEndDate(loan: TotalRuntimeLoan): Date | null {
  if (loan.terminationType !== TerminationType.ENDDATE && loan.terminationType !== TerminationType.DURATION) {
    return null;
  }

  return resolveContractEndDate({
    terminationType: loan.terminationType,
    signDate: loan.signDate,
    endDate: loan.endDate,
    duration: loan.duration,
    durationType: loan.durationType,
    isSavingsContract: false,
    savingsFirstDepositDate: null,
    savingsLastDepositDate: null,
    savingsDepositCount: null,
  });
}

export function getTotalRuntime(loan: TotalRuntimeLoan): TotalRuntime {
  if (loan.terminationType === TerminationType.TERMINATION) {
    return { terminationType: TerminationType.TERMINATION, days: null };
  }

  const end = getContractEndDate(loan);
  if (!end) {
    return { terminationType: loan.terminationType, days: null };
  }

  const days = moment(end).startOf('day').diff(moment(loan.signDate).startOf('day'), 'days');
  return {
    terminationType: loan.terminationType,
    days: days >= 0 ? days : null,
  };
}

/** Calendar length of a loan's Kreditlaufzeit, or the notice label when it ends by Kündigung. */
export function formatTotalRuntime(
  loan: TotalRuntimeLoan,
  t: (key: string, values?: Record<string, number>) => string,
): string {
  const value = getTotalRuntime(loan);
  if (value.terminationType === TerminationType.TERMINATION) {
    return t('byTermination');
  }

  const end = getContractEndDate(loan);
  if (!end) {
    return '–';
  }

  return formatCalendarDuration(loan.signDate, end, t);
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
