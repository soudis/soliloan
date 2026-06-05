import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import {
  createAggregateMetricCache,
  filterLoansForHistoryColumn,
  type AggregateMetricCache,
} from '@/lib/dashboard/history-table/compute-history-table';
import { interestRateAverageWeight } from '@/lib/dashboard/interest-rate-average';
import type { LoanMetricCacheMap } from '@/lib/dashboard/history-table/loan-metric-cache';
import type { HistoryPeriod } from '@/lib/dashboard/history-table/rollup-period';
import type { HistoryTableWidgetConfig } from '@/types/dashboard-widgets/history-table';
import type { StatAggregation, StatItemConfig } from '@/types/dashboard-widgets/stat-widget';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

import { getPerLoanStatSnapshotValue, median } from './collect-per-loan-stat-values';

const STAT_HISTORY_CONFIG: HistoryTableWidgetConfig = {
  layoutVersion: 1,
  periodMode: 'monthly',
  periodCount: null,
  columns: [],
};

function collectPerLoanValues(
  loans: DashboardLoan[],
  stat: StatItemConfig,
  period: HistoryPeriod,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
  cache: AggregateMetricCache | undefined,
  loanMetricCaches: LoanMetricCacheMap,
): number[] {
  const filtered = filterLoansForHistoryColumn(
    loans,
    {
      id: stat.id,
      title: stat.title,
      metric: stat.metric,
      aggregation: 'cumulative',
      filters: stat.filters,
    },
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
    {
      id: stat.id,
      title: stat.title,
      metric: stat.metric,
      aggregation: 'cumulative',
      filters: stat.filters,
    },
    period,
    STAT_HISTORY_CONFIG,
    fieldOptions,
    commonT,
    cache,
  );

  let rateWeighted = 0;
  let weightSum = 0;

  for (const loan of filtered) {
    const rate = getPerLoanStatSnapshotValue(loan, stat.metric, period, loanMetricCaches);
    if (rate === null || Number.isNaN(rate)) {
      continue;
    }
    // Include only loans active at period end (positive balance), but weight by
    // contract amount to stay consistent with history and pie widgets.
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

export function createStatAggregateCache(): AggregateMetricCache {
  return createAggregateMetricCache();
}
