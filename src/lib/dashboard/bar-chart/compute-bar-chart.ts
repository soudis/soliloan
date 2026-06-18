import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { computeDiscriminatorChartData } from '@/lib/dashboard/chart/compute-discriminator-chart';
import { computeTimelineChartData } from '@/lib/dashboard/chart/compute-timeline-chart';
import type { ChartDataModel } from '@/lib/dashboard/chart/chart-data-model';
import { resolveMetricTitle } from '@/lib/dashboard/resolve-metric-title';
import type { BarChartWidgetConfig } from '@/types/dashboard-widgets/bar-chart';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

export function computeBarChart(
  loans: DashboardLoan[],
  config: BarChartWidgetConfig,
  toDate: Date,
  fieldOptions: EntityFilterFieldOption[],
  locale: string,
  formatMonthLabel: (year: number, month: number) => string,
  emptyLabel: string,
  otherLabel: string,
  untilNowLabel: string,
  commonT: (key: string, values?: Record<string, string>) => string,
  tDiscriminator: (key: string, values?: Record<string, string | number>) => string,
  metricLabel: (metric: BarChartWidgetConfig['series'][number]['metric']) => string,
): ChartDataModel {
  const resolveSeriesLabel = (col: BarChartWidgetConfig['series'][number], fallback: string) =>
    resolveMetricTitle(col.title, fallback);

  if (config.xAxisMode === 'discriminator') {
    return computeDiscriminatorChartData(
      loans,
      config.discriminator,
      config.series,
      toDate,
      fieldOptions,
      locale,
      emptyLabel,
      otherLabel,
      commonT,
      tDiscriminator,
      resolveSeriesLabel,
      metricLabel,
    );
  }

  return computeTimelineChartData(
    loans,
    config.timeline,
    config.series,
    toDate,
    fieldOptions,
    formatMonthLabel,
    commonT,
    untilNowLabel,
    resolveSeriesLabel,
    metricLabel,
  );
}
