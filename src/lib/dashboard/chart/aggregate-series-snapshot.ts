import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import {
  aggregateMetric,
  type AggregateMetricCache,
} from '@/lib/dashboard/history-table/compute-history-table';
import { buildStatPeriodAtDate } from '@/lib/dashboard/stat-widget/build-stat-period';
import type { ChartSeriesConfig } from '@/types/dashboard-widgets/chart-series';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

export function aggregateSeriesSnapshot(
  loans: DashboardLoan[],
  series: ChartSeriesConfig,
  toDate: Date,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
  cache?: AggregateMetricCache,
): number | null {
  const period = buildStatPeriodAtDate(toDate);
  const column = {
    ...series,
    aggregation: 'cumulative' as const,
  };
  return aggregateMetric(
    loans,
    column,
    period,
    { layoutVersion: 1, periodMode: 'monthly', periodCount: null, columns: [] },
    fieldOptions,
    commonT,
    cache,
  );
}
