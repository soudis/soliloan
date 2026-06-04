import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { aggregateMetric } from '@/lib/dashboard/history-table/compute-history-table';
import type { HistoryTableColumnConfig, HistoryTableWidgetConfig } from '@/types/dashboard-widgets/history-table';
import {
  createDefaultStatDeltaRange,
  type StatItemConfig,
} from '@/types/dashboard-widgets/stat-widget';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

import {
  buildStatBaselinePeriodBefore,
  buildStatPeriodAtDate,
  getStatDeltaRangeStart,
} from './build-stat-period';

const STAT_HISTORY_CONFIG: HistoryTableWidgetConfig = {
  layoutVersion: 1,
  periodMode: 'monthly',
  periodCount: null,
  columns: [],
};

function toHistoryColumn(stat: StatItemConfig): HistoryTableColumnConfig {
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
): number | null {
  const period = buildStatPeriodAtDate(periodEnd);
  return aggregateMetric(
    loans,
    toHistoryColumn(stat),
    period,
    STAT_HISTORY_CONFIG,
    fieldOptions,
    commonT,
  );
}

export function computeStatValue(
  loans: DashboardLoan[],
  stat: StatItemConfig,
  toDate: Date,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
): number | null {
  if (stat.aggregation === 'total') {
    return metricAtPeriod(loans, stat, toDate, fieldOptions, commonT);
  }

  const range = stat.deltaRange ?? createDefaultStatDeltaRange();
  const rangeStart = getStatDeltaRangeStart(toDate, range);
  const baselineEnd = buildStatBaselinePeriodBefore(rangeStart).periodEnd;

  const endValue = metricAtPeriod(loans, stat, toDate, fieldOptions, commonT) ?? 0;
  const baseValue = metricAtPeriod(loans, stat, baselineEnd, fieldOptions, commonT) ?? 0;

  return endValue - baseValue;
}
