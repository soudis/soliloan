'use client';

import { BarElement, CategoryScale, Chart as ChartJS, type ChartOptions, Legend, LinearScale, Tooltip } from 'chart.js';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { useAnimatedChartData } from '@/hooks/use-animated-chart-data';
import { computeBarChart } from '@/lib/dashboard/bar-chart/compute-bar-chart';
import { chartColorAtIndex } from '@/lib/dashboard/chart/chart-dataset-colors';
import { DASHBOARD_CHART_ANIMATION } from '@/lib/dashboard/chart-animation';
import { formatDashboardMetricValue } from '@/lib/dashboard/format-metric-value';
import { profileWidgetCompute } from '@/lib/dashboard/profile-widget-compute';
import { buildWidgetComputeCacheKey } from '@/lib/dashboard/widget-compute-cache';
import { cn } from '@/lib/utils';
import type { DashboardWidget } from '@/types/dashboard-layout';
import { parseBarChartConfig } from '@/types/dashboard-widgets/bar-chart';
import { getPieChartHeightClassName } from '@/types/dashboard-widgets/pie-chart';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export function BarChartWidget({ widget }: { widget: DashboardWidget }) {
  const t = useTranslations('dashboard.widgets.barChart');
  const tHistoryTable = useTranslations('dashboard.widgets.historyTable');
  const tHistory = useTranslations('dashboard.customizer.historyTable');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const formatter = useFormatter();
  const { loans, toDate, fieldOptions, getOrComputeWidgetResult } = useDashboardData();

  const config = useMemo(() => parseBarChartConfig(widget.config), [widget.config]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only recompute result when widget config changes
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
              computeBarChart(
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
      widget.id,
      widget.type,
      getOrComputeWidgetResult,
    ],
  );

  const chartData = useMemo(() => {
    if (!result) {
      return null;
    }
    return {
      labels: result.labels,
      datasets: result.datasets.map((ds, i) => ({
        label: ds.label,
        data: ds.values.map((v) => (v === null ? 0 : v)),
        backgroundColor: chartColorAtIndex(i),
        borderWidth: 1,
        stack: config.seriesLayout === 'stacked' ? 'stack' : undefined,
      })),
    };
  }, [result, config.seriesLayout]);

  const animatedChartData = useAnimatedChartData(chartData);

  const options: ChartOptions<'bar'> = useMemo(
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
        x: {
          stacked: config.seriesLayout === 'stacked',
        },
        y: {
          stacked: config.seriesLayout === 'stacked',
          beginAtZero: true,
        },
      },
    }),
    [config.series, config.seriesLayout],
  );

  if (config.series.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('emptySeries')}</p>;
  }

  if (!chartData || chartData.labels.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('emptyChart')}</p>;
  }

  return (
    <div className={cn('w-full', getPieChartHeightClassName(config.chartSize))}>
      {animatedChartData ? <Bar data={animatedChartData} options={options} /> : null}
    </div>
  );
}
