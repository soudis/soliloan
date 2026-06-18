'use client';

import {
  BarElement,
  CategoryScale,
  type ChartData,
  Chart as ChartJS,
  type ChartOptions,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

import { useAnimatedChartData } from '@/hooks/use-animated-chart-data';
import { type ChartComputeContext, useDashboardChartResult } from '@/hooks/use-dashboard-chart-result';
import { computeBarChart } from '@/lib/dashboard/bar-chart/compute-bar-chart';
import { chartColorAtIndex } from '@/lib/dashboard/chart/chart-dataset-colors';
import { DASHBOARD_CHART_ANIMATION } from '@/lib/dashboard/chart-animation';
import { formatDashboardMetricValue } from '@/lib/dashboard/format-metric-value';
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

  const config = useMemo(() => parseBarChartConfig(widget.config), [widget.config]);

  const compute = useCallback(
    ({ loans, toDate, fieldOptions, locale, formatMonth }: ChartComputeContext) =>
      computeBarChart(
        loans,
        config,
        toDate,
        fieldOptions,
        locale,
        formatMonth,
        t('emptyValue'),
        t('otherCategory'),
        tHistoryTable('untilNow'),
        (key, values) => commonT(key, values),
        (key, values) => t(key, values),
        (metric) => tHistory(`metrics.${metric}`),
      ),
    [config, t, tHistory, tHistoryTable, commonT],
  );

  const result = useDashboardChartResult(widget, config.series.length > 0, compute);

  const chartData = useMemo<ChartData<'bar'> | null>(() => {
    if (!result) {
      return null;
    }
    return {
      labels: result.labels,
      datasets: result.datasets.map((ds, i) => ({
        label: ds.label,
        // Keep nulls as gaps (no bar) to match the line chart instead of rendering a 0 bar.
        data: ds.values.map((v) => v),
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

  if (!chartData?.labels?.length) {
    return <p className="text-sm text-muted-foreground">{t('emptyChart')}</p>;
  }

  return (
    <div className={cn('w-full', getPieChartHeightClassName(config.chartSize))}>
      {animatedChartData ? <Bar data={animatedChartData} options={options} /> : null}
    </div>
  );
}
