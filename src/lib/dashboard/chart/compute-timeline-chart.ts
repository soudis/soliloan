import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { computeHistoryTable } from '@/lib/dashboard/history-table/compute-history-table';
import type { BarChartTimelineConfig } from '@/types/dashboard-widgets/bar-chart';
import type { ChartSeriesConfig } from '@/types/dashboard-widgets/chart-series';
import type { HistoryTableWidgetConfig } from '@/types/dashboard-widgets/history-table';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

import type { ChartDataModel } from './chart-data-model';

export function computeTimelineChartData(
  loans: DashboardLoan[],
  timeline: BarChartTimelineConfig,
  series: ChartSeriesConfig[],
  toDate: Date,
  fieldOptions: EntityFilterFieldOption[],
  formatMonthLabel: (year: number, month: number) => string,
  commonT: (key: string, values?: Record<string, string>) => string,
  untilNowLabel: string,
  resolveSeriesLabel: (col: ChartSeriesConfig, metricLabel: string) => string,
  metricLabel: (metric: ChartSeriesConfig['metric']) => string,
): ChartDataModel {
  const tableConfig: HistoryTableWidgetConfig = {
    layoutVersion: 1,
    periodMode: timeline.periodMode,
    periodCount: timeline.periodCount,
    columns: series,
  };

  const result = computeHistoryTable(
    loans,
    tableConfig,
    toDate,
    fieldOptions,
    formatMonthLabel,
    commonT,
    untilNowLabel,
  );

  const labels = result.periods.map((p) => p.label);

  const datasets = series.map((col) => {
    const metric = metricLabel(col.metric);
    const title = resolveSeriesLabel(col, metric);
    const values = result.periods.map((p) => result.cells[p.key]?.[col.id] ?? null);
    return {
      id: col.id,
      label: title,
      values,
    };
  });

  return { labels, datasets };
}
