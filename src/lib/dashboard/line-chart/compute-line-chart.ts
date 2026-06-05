import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { computeBarChart } from '@/lib/dashboard/bar-chart/compute-bar-chart';
import type { ChartDataModel } from '@/lib/dashboard/chart/chart-data-model';
import type { BarChartWidgetConfig } from '@/types/dashboard-widgets/bar-chart';
import type { LineChartWidgetConfig } from '@/types/dashboard-widgets/line-chart';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

export function computeLineChart(
  loans: DashboardLoan[],
  config: LineChartWidgetConfig,
  toDate: Date,
  fieldOptions: EntityFilterFieldOption[],
  locale: string,
  formatMonthLabel: (year: number, month: number) => string,
  emptyLabel: string,
  otherLabel: string,
  untilNowLabel: string,
  commonT: (key: string, values?: Record<string, string>) => string,
  tDiscriminator: (key: string, values?: Record<string, string | number>) => string,
  metricLabel: (metric: LineChartWidgetConfig['series'][number]['metric']) => string,
): ChartDataModel {
  return computeBarChart(
    loans,
    {
      ...config,
      seriesLayout: 'grouped',
    } as BarChartWidgetConfig,
    toDate,
    fieldOptions,
    locale,
    formatMonthLabel,
    emptyLabel,
    otherLabel,
    untilNowLabel,
    commonT,
    tDiscriminator,
    metricLabel,
  );
}
