import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { loanActiveAtPeriodEnd } from '@/lib/entity-filters/get-filter-value';
import type { HistoryTableMetric } from '@/types/dashboard-widgets/history-table';

import { historyHasMonthForPeriodEnd } from '../history-table/history-month-cutoff';
import type { LoanMetricCacheMap } from '../history-table/loan-metric-cache';
import type { HistoryPeriod } from '../history-table/rollup-period';

function loanHasHistoryBeforePeriodEnd(loan: DashboardLoan, period: HistoryPeriod): boolean {
  return historyHasMonthForPeriodEnd(loan.history, loan.transactions, period.periodEnd);
}

function getCachedLoanMetrics(loan: DashboardLoan, period: HistoryPeriod, loanMetricCaches: LoanMetricCacheMap) {
  const cached = loanMetricCaches.get(loan.id);
  return {
    periodNumbers: cached?.periodByPeriodKey.get(period.key) ?? null,
    cumulative: cached?.cumulativeByPeriodKey.get(period.key) ?? null,
  };
}

export function getPerLoanStatSnapshotValue(
  loan: DashboardLoan,
  metric: HistoryTableMetric,
  period: HistoryPeriod,
  loanMetricCaches: LoanMetricCacheMap,
): number | null {
  if (!loanHasHistoryBeforePeriodEnd(loan, period)) {
    return null;
  }

  const { cumulative } = getCachedLoanMetrics(loan, period, loanMetricCaches);
  if (!cumulative) {
    return null;
  }

  switch (metric) {
    case 'loanCount':
      return null;
    case 'contractAmount':
      return loanActiveAtPeriodEnd(loan, period.periodEnd) ? Number(loan.amount) : null;
    case 'interestRateAvg':
      return Number(loan.interestRate);
    case 'balance':
      return cumulative.end;
    case 'deposits':
    case 'withdrawals':
    case 'notReclaimed':
    case 'interest':
    case 'interestPaid':
    case 'interestError':
      return cumulative[metric];
    default:
      return null;
  }
}

export function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    const lower = sorted[mid - 1];
    const upper = sorted[mid];
    if (lower === undefined || upper === undefined) {
      return null;
    }
    return (lower + upper) / 2;
  }
  const middle = sorted[mid];
  return middle === undefined ? null : middle;
}
