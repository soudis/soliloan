import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import {
  aggregateMetric,
  createAggregateMetricCache,
  type AggregateMetricCache,
} from '@/lib/dashboard/history-table/compute-history-table';
import { buildAllLoanMetricCaches } from '@/lib/dashboard/history-table/loan-metric-cache';
import type { HistoryTableColumnConfig, HistoryTableWidgetConfig } from '@/types/dashboard-widgets/history-table';
import {
  createDefaultStatDeltaRange,
  isHistoryTableStatMetric,
  type StatItemConfig,
} from '@/types/dashboard-widgets/stat-widget';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

import { buildStatBaselinePeriodBefore, buildStatPeriodAtDate, getStatDeltaRangeStart } from './build-stat-period';
import { computeStatAggregateValue, computeStatByLenderAggregateValue } from './compute-stat-aggregate';
import { median } from './collect-per-loan-stat-values';
import { collectStatDurationValues, computeLenderCountStat } from './stat-only-metrics';

const STAT_HISTORY_CONFIG: HistoryTableWidgetConfig = {
  layoutVersion: 1,
  periodMode: 'monthly',
  periodCount: null,
  columns: [],
};

function toHistoryColumn(stat: StatItemConfig): HistoryTableColumnConfig | null {
  if (!isHistoryTableStatMetric(stat.metric)) {
    return null;
  }
  return {
    id: stat.id,
    title: stat.title,
    metric: stat.metric,
    aggregation: 'cumulative',
    filters: stat.filters,
  };
}

function metricAtPeriod(
  loans: DashboardLoan[],
  stat: StatItemConfig,
  periodEnd: Date,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
  cache?: AggregateMetricCache,
  loanMetricCaches?: ReturnType<typeof buildAllLoanMetricCaches>,
): number | null {
  const column = toHistoryColumn(stat);
  if (!column) {
    return null;
  }

  const period = buildStatPeriodAtDate(periodEnd);
  return aggregateMetric(
    loans,
    column,
    period,
    STAT_HISTORY_CONFIG,
    fieldOptions,
    commonT,
    cache,
    loanMetricCaches,
  );
}

function computeStatOnlyValue(
  loans: DashboardLoan[],
  stat: StatItemConfig,
  toDate: Date,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
  cache: AggregateMetricCache,
): number | null {
  const endPeriod = buildStatPeriodAtDate(toDate);

  if (stat.metric === 'lenderCount') {
    return computeLenderCountStat(loans, stat, endPeriod, fieldOptions, commonT, cache);
  }

  if (stat.metric === 'loanTerm' || stat.metric === 'repaymentPeriod') {
    const values = collectStatDurationValues(loans, stat, endPeriod, toDate, fieldOptions, commonT, cache);
    if (values.length === 0) {
      return null;
    }
    if (stat.aggregation === 'median') {
      return median(values);
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  return null;
}

export function computeStatValue(
  loans: DashboardLoan[],
  stat: StatItemConfig,
  toDate: Date,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
): number | null {
  const cache = createAggregateMetricCache();
  const endPeriod = buildStatPeriodAtDate(toDate);

  if (!isHistoryTableStatMetric(stat.metric)) {
    return computeStatOnlyValue(loans, stat, toDate, fieldOptions, commonT, cache);
  }

  if (stat.aggregation === 'total') {
    const loanMetricCaches = buildAllLoanMetricCaches(loans, [endPeriod], 'monthly');
    return metricAtPeriod(loans, stat, toDate, fieldOptions, commonT, cache, loanMetricCaches);
  }

  if (stat.aggregation === 'average' || stat.aggregation === 'median') {
    const loanMetricCaches = buildAllLoanMetricCaches(loans, [endPeriod], 'monthly');
    return computeStatAggregateValue(
      loans,
      stat,
      stat.aggregation,
      endPeriod,
      fieldOptions,
      commonT,
      cache,
      loanMetricCaches,
    );
  }

  if (stat.aggregation === 'averageByLender' || stat.aggregation === 'medianByLender') {
    const loanMetricCaches = buildAllLoanMetricCaches(loans, [endPeriod], 'monthly');
    return computeStatByLenderAggregateValue(
      loans,
      stat,
      stat.aggregation,
      endPeriod,
      fieldOptions,
      commonT,
      cache,
      loanMetricCaches,
    );
  }

  const range = stat.deltaRange ?? createDefaultStatDeltaRange();
  const rangeStart = getStatDeltaRangeStart(toDate, range);
  const baselineEnd = buildStatBaselinePeriodBefore(rangeStart).periodEnd;
  const baselinePeriod = buildStatPeriodAtDate(baselineEnd);
  const loanMetricCaches = buildAllLoanMetricCaches(loans, [endPeriod, baselinePeriod], 'monthly');

  const endValue = metricAtPeriod(loans, stat, toDate, fieldOptions, commonT, cache, loanMetricCaches) ?? 0;
  const baseValue = metricAtPeriod(loans, stat, baselineEnd, fieldOptions, commonT, cache, loanMetricCaches) ?? 0;

  return endValue - baseValue;
}

export function computeAllStatValues(
  loans: DashboardLoan[],
  stats: StatItemConfig[],
  toDate: Date,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
): { stat: StatItemConfig; value: number | null }[] {
  if (stats.length === 0) {
    return [];
  }

  const snapshotCache = createAggregateMetricCache();
  const endPeriod = buildStatPeriodAtDate(toDate);
  const periodsByKey = new Map<string, ReturnType<typeof buildStatPeriodAtDate>>();
  periodsByKey.set(endPeriod.key, endPeriod);

  for (const stat of stats) {
    if (isHistoryTableStatMetric(stat.metric) && stat.aggregation === 'delta') {
      const range = stat.deltaRange ?? createDefaultStatDeltaRange();
      const rangeStart = getStatDeltaRangeStart(toDate, range);
      const baselineEnd = buildStatBaselinePeriodBefore(rangeStart).periodEnd;
      const baselinePeriod = buildStatPeriodAtDate(baselineEnd);
      periodsByKey.set(baselinePeriod.key, baselinePeriod);
    }
  }

  const loanMetricCaches = buildAllLoanMetricCaches(loans, [...periodsByKey.values()], 'monthly');

  return stats.map((stat) => ({
    stat,
    value: computeStatValueWithSharedCaches(
      loans,
      stat,
      toDate,
      fieldOptions,
      commonT,
      snapshotCache,
      loanMetricCaches,
    ),
  }));
}

function computeStatValueWithSharedCaches(
  loans: DashboardLoan[],
  stat: StatItemConfig,
  toDate: Date,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
  snapshotCache: AggregateMetricCache,
  loanMetricCaches: ReturnType<typeof buildAllLoanMetricCaches>,
): number | null {
  if (!isHistoryTableStatMetric(stat.metric)) {
    return computeStatOnlyValue(loans, stat, toDate, fieldOptions, commonT, snapshotCache);
  }

  if (stat.aggregation === 'total') {
    return metricAtPeriod(loans, stat, toDate, fieldOptions, commonT, snapshotCache, loanMetricCaches);
  }

  if (stat.aggregation === 'average' || stat.aggregation === 'median') {
    return computeStatAggregateValue(
      loans,
      stat,
      stat.aggregation,
      buildStatPeriodAtDate(toDate),
      fieldOptions,
      commonT,
      snapshotCache,
      loanMetricCaches,
    );
  }

  if (stat.aggregation === 'averageByLender' || stat.aggregation === 'medianByLender') {
    return computeStatByLenderAggregateValue(
      loans,
      stat,
      stat.aggregation,
      buildStatPeriodAtDate(toDate),
      fieldOptions,
      commonT,
      snapshotCache,
      loanMetricCaches,
    );
  }

  const range = stat.deltaRange ?? createDefaultStatDeltaRange();
  const rangeStart = getStatDeltaRangeStart(toDate, range);
  const baselineEnd = buildStatBaselinePeriodBefore(rangeStart).periodEnd;

  const endValue = metricAtPeriod(loans, stat, toDate, fieldOptions, commonT, snapshotCache, loanMetricCaches) ?? 0;
  const baseValue =
    metricAtPeriod(loans, stat, baselineEnd, fieldOptions, commonT, snapshotCache, loanMetricCaches) ?? 0;

  return endValue - baseValue;
}
