'use client';

import {
  CategoryScale,
  type ChartData,
  Chart as ChartJS,
  type ChartOptions,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { useAnimatedChartData } from '@/hooks/use-animated-chart-data';
import { chartColorAtIndex } from '@/lib/dashboard/chart/chart-dataset-colors';
import { resolveLineChartDatasetStyle } from '@/lib/dashboard/chart/line-chart-dataset-style';
import { zeroLinePlugin } from '@/lib/dashboard/chart/zero-line-plugin';
import { DASHBOARD_CHART_ANIMATION } from '@/lib/dashboard/chart-animation';
import { formatDashboardMetricValue } from '@/lib/dashboard/format-metric-value';
import { computeLineChart } from '@/lib/dashboard/line-chart/compute-line-chart';
import { profileWidgetCompute } from '@/lib/dashboard/profile-widget-compute';
import { buildWidgetComputeCacheKey } from '@/lib/dashboard/widget-compute-cache';
import { cn } from '@/lib/utils';
import type { DashboardWidget } from '@/types/dashboard-layout';
import { parseLineChartConfig } from '@/types/dashboard-widgets/line-chart';
import { getPieChartHeightClassName } from '@/types/dashboard-widgets/pie-chart';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend, Filler, zeroLinePlugin);

export function LineChartWidget({ widget }: { widget: DashboardWidget }) {
  const t = useTranslations('dashboard.widgets.lineChart');
  const tHistoryTable = useTranslations('dashboard.widgets.historyTable');
  const tHistory = useTranslations('dashboard.customizer.historyTable');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const formatter = useFormatter();
  const { loans, toDate, fieldOptions, getOrComputeWidgetResult } = useDashboardData();

  const config = useMemo(() => parseLineChartConfig(widget.config), [widget.config]);

  const result = useMemo(
    () =>
      profileWidgetCompute({
        widgetType: widget.type,
        widgetId: widget.id,
        loanCount: loans.length,
        compute: () => {
          if (config.series.length === 0) {
            return null;
          }
          return getOrComputeWidgetResult(
            buildWidgetComputeCacheKey(widget.type, widget.config, loans.length, toDate.getTime()),
            () =>
              computeLineChart(
                loans,
                config,
                toDate,
                fieldOptions,
                locale,
                (year, month) => formatter.dateTime(new Date(year, month - 1, 1), { month: 'short', year: 'numeric' }),
                t('emptyValue'),
                t('otherCategory'),
                tHistoryTable('untilNow'),
                (key, values) => commonT(key, values),
                (key, values) => t(key, values),
                (metric) => tHistory(`metrics.${metric}`),
              ),
          );
        },
      }),
    [
      loans,
      config,
      toDate,
      fieldOptions,
      locale,
      formatter,
      t,
      tHistory,
      tHistoryTable,
      commonT,
      widget.config,
      widget.id,
      widget.type,
      getOrComputeWidgetResult,
    ],
  );

  const chartData = useMemo<ChartData<'line'> | null>(() => {
    if (!result) {
      return null;
    }
    return {
      labels: result.labels,
      datasets: result.datasets.map((ds, i) => {
        const series = config.series[i];
        const color = chartColorAtIndex(i);
        const style = series ? resolveLineChartDatasetStyle(series, color) : { borderColor: color };
        return {
          label: ds.label,
          data: ds.values.map((v) => v),
          ...style,
        };
      }),
    };
  }, [result, config.series]);

  const animatedChartData = useAnimatedChartData(chartData);

  const options: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: DASHBOARD_CHART_ANIMATION,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const raw = ctx.raw;
              const series = config.series[ctx.datasetIndex];
              if (!series || raw === null || raw === undefined) {
                return '';
              }
              const formatted = formatDashboardMetricValue(series.metric, Number(raw), series.aggregation === 'delta');
              return `${ctx.dataset.label}: ${formatted}`;
            },
          },
        },
      },
      scales: {
        x: {},
        y: {
          beginAtZero: config.beginAtZero,
        },
      },
    }),
    [config.beginAtZero, config.series],
  );

  if (config.series.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('emptySeries')}</p>;
  }

  if (!chartData?.labels?.length) {
    return <p className="text-sm text-muted-foreground">{t('emptyChart')}</p>;
  }

  return (
    <div className={cn('w-full', getPieChartHeightClassName(config.chartSize))}>
      {animatedChartData ? <Line data={animatedChartData} options={options} /> : null}
    </div>
  );
}
