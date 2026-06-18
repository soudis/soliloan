import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import {
  getLoanTermDaysForDashboard,
  getRepaymentPeriodDaysForDashboard,
} from '@/lib/calculations/loan-duration-metrics';
import {
  createAggregateMetricCache,
  filterLoansForHistoryColumn,
  type AggregateMetricCache,
} from '@/lib/dashboard/history-table/compute-history-table';
import type { LoanMetricCacheMap } from '@/lib/dashboard/history-table/loan-metric-cache';
import type { HistoryPeriod } from '@/lib/dashboard/history-table/rollup-period';
import type { HistoryTableWidgetConfig } from '@/types/dashboard-widgets/history-table';
import type { StatItemConfig } from '@/types/dashboard-widgets/stat-widget';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

const STAT_HISTORY_CONFIG: HistoryTableWidgetConfig = {
  layoutVersion: 1,
  periodMode: 'monthly',
  periodCount: null,
  columns: [],
};

function statFilterColumn(stat: StatItemConfig) {
  return {
    id: stat.id,
    title: stat.title,
    metric: 'balance' as const,
    aggregation: 'cumulative' as const,
    filters: stat.filters,
  };
}

export function filterLoansForStat(
  loans: DashboardLoan[],
  stat: StatItemConfig,
  period: HistoryPeriod,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
  cache: AggregateMetricCache | undefined,
): DashboardLoan[] {
  return filterLoansForHistoryColumn(
    loans,
    statFilterColumn(stat),
    period,
    STAT_HISTORY_CONFIG,
    fieldOptions,
    commonT,
    cache,
  );
}

export function computeLenderCountStat(
  loans: DashboardLoan[],
  stat: StatItemConfig,
  period: HistoryPeriod,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
  cache: AggregateMetricCache | undefined,
): number | null {
  const filtered = filterLoansForStat(loans, stat, period, fieldOptions, commonT, cache);
  if (filtered.length === 0) {
    return 0;
  }
  return new Set(filtered.map((loan) => loan.lenderId)).size;
}

export function getStatDurationDays(
  loan: DashboardLoan,
  metric: StatItemConfig['metric'],
  toDate: Date,
): number | null {
  if (metric === 'loanTerm') {
    return getLoanTermDaysForDashboard(loan, toDate);
  }
  if (metric === 'repaymentPeriod') {
    return getRepaymentPeriodDaysForDashboard(loan, toDate);
  }
  return null;
}

export function collectStatDurationValues(
  loans: DashboardLoan[],
  stat: StatItemConfig,
  period: HistoryPeriod,
  toDate: Date,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
  cache: AggregateMetricCache | undefined,
): number[] {
  const filtered = filterLoansForStat(loans, stat, period, fieldOptions, commonT, cache);
  const values: number[] = [];

  for (const loan of filtered) {
    const value = getStatDurationDays(loan, stat.metric, toDate);
    if (value === null || Number.isNaN(value)) {
      continue;
    }
    values.push(value);
  }

  return values;
}

export function createStatAggregateCache(): AggregateMetricCache {
  return createAggregateMetricCache();
}

export type { LoanMetricCacheMap };
