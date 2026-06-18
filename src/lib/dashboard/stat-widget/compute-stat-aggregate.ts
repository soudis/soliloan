import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import {
  createAggregateMetricCache,
  filterLoansForHistoryColumn,
  type AggregateMetricCache,
} from '@/lib/dashboard/history-table/compute-history-table';
import { interestRateAverageWeight } from '@/lib/dashboard/interest-rate-average';
import type { LoanMetricCacheMap } from '@/lib/dashboard/history-table/loan-metric-cache';
import type { HistoryPeriod } from '@/lib/dashboard/history-table/rollup-period';
import type { HistoryTableWidgetConfig, HistoryTableColumnConfig } from '@/types/dashboard-widgets/history-table';
import {
  isHistoryTableStatMetric,
  type HistoryTableStatMetric,
  type StatAggregation,
  type StatItemConfig,
} from '@/types/dashboard-widgets/stat-widget';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

import { getPerLoanStatSnapshotValue, median } from './collect-per-loan-stat-values';

const STAT_HISTORY_CONFIG: HistoryTableWidgetConfig = {
  layoutVersion: 1,
  periodMode: 'monthly',
  periodCount: null,
  columns: [],
};

function statHistoryColumn(stat: StatItemConfig & { metric: HistoryTableStatMetric }): HistoryTableColumnConfig {
  return {
    id: stat.id,
    title: stat.title,
    metric: stat.metric,
    aggregation: 'cumulative',
    filters: stat.filters,
  };
}

function collectPerLoanValues(
  loans: DashboardLoan[],
  stat: StatItemConfig,
  period: HistoryPeriod,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
  cache: AggregateMetricCache | undefined,
  loanMetricCaches: LoanMetricCacheMap,
): number[] {
  if (!isHistoryTableStatMetric(stat.metric)) {
    return [];
  }

  const filtered = filterLoansForHistoryColumn(
    loans,
    statHistoryColumn({ ...stat, metric: stat.metric }),
    period,
    STAT_HISTORY_CONFIG,
    fieldOptions,
    commonT,
    cache,
  );

  const values: number[] = [];
  for (const loan of filtered) {
    const value = getPerLoanStatSnapshotValue(loan, stat.metric, period, loanMetricCaches);
    if (value === null || Number.isNaN(value)) {
      continue;
    }
    values.push(value);
  }
  return values;
}

function collectPerLenderSums(
  loans: DashboardLoan[],
  stat: StatItemConfig,
  period: HistoryPeriod,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
  cache: AggregateMetricCache | undefined,
  loanMetricCaches: LoanMetricCacheMap,
): number[] {
  if (!isHistoryTableStatMetric(stat.metric)) {
    return [];
  }

  const filtered = filterLoansForHistoryColumn(
    loans,
    statHistoryColumn({ ...stat, metric: stat.metric }),
    period,
    STAT_HISTORY_CONFIG,
    fieldOptions,
    commonT,
    cache,
  );

  const lenderSums = new Map<string, number>();

  for (const loan of filtered) {
    const value = getPerLoanStatSnapshotValue(loan, stat.metric, period, loanMetricCaches);
    if (value === null || Number.isNaN(value)) {
      continue;
    }
    lenderSums.set(loan.lenderId, (lenderSums.get(loan.lenderId) ?? 0) + value);
  }

  return [...lenderSums.values()];
}

function computeWeightedInterestRateAverage(
  loans: DashboardLoan[],
  stat: StatItemConfig,
  period: HistoryPeriod,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
  cache: AggregateMetricCache | undefined,
  loanMetricCaches: LoanMetricCacheMap,
): number | null {
  const filtered = filterLoansForHistoryColumn(
    loans,
    statHistoryColumn({ ...stat, metric: 'interestRateAvg' }),
    period,
    STAT_HISTORY_CONFIG,
    fieldOptions,
    commonT,
    cache,
  );

  let rateWeighted = 0;
  let weightSum = 0;

  for (const loan of filtered) {
    const rate = getPerLoanStatSnapshotValue(loan, 'interestRateAvg', period, loanMetricCaches);
    if (rate === null || Number.isNaN(rate)) {
      continue;
    }
    const balance = getPerLoanStatSnapshotValue(loan, 'balance', period, loanMetricCaches) ?? 0;
    if (balance <= 0) {
      continue;
    }
    const weight = interestRateAverageWeight(loan);
    rateWeighted += rate * weight;
    weightSum += weight;
  }

  return weightSum > 0 ? rateWeighted / weightSum : null;
}

export function computeStatAggregateValue(
  loans: DashboardLoan[],
  stat: StatItemConfig,
  aggregation: Extract<StatAggregation, 'average' | 'median'>,
  period: HistoryPeriod,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
  cache: AggregateMetricCache | undefined,
  loanMetricCaches: LoanMetricCacheMap,
): number | null {
  if (aggregation === 'average' && stat.metric === 'interestRateAvg') {
    return computeWeightedInterestRateAverage(loans, stat, period, fieldOptions, commonT, cache, loanMetricCaches);
  }

  const values = collectPerLoanValues(loans, stat, period, fieldOptions, commonT, cache, loanMetricCaches);

  if (values.length === 0) {
    return null;
  }

  if (aggregation === 'median') {
    return median(values);
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function computeStatByLenderAggregateValue(
  loans: DashboardLoan[],
  stat: StatItemConfig,
  aggregation: Extract<StatAggregation, 'averageByLender' | 'medianByLender'>,
  period: HistoryPeriod,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
  cache: AggregateMetricCache | undefined,
  loanMetricCaches: LoanMetricCacheMap,
): number | null {
  const lenderSums = collectPerLenderSums(loans, stat, period, fieldOptions, commonT, cache, loanMetricCaches);

  if (lenderSums.length === 0) {
    return null;
  }

  if (aggregation === 'medianByLender') {
    return median(lenderSums);
  }

  return lenderSums.reduce((sum, value) => sum + value, 0) / lenderSums.length;
}

export function createStatAggregateCache(): AggregateMetricCache {
  return createAggregateMetricCache();
}
