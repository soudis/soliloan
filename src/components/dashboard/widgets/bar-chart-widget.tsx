'use client';

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  type ChartOptions,
  Tooltip,
} from 'chart.js';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { computeBarChart } from '@/lib/dashboard/bar-chart/compute-bar-chart';
import { profileWidgetCompute } from '@/lib/dashboard/profile-widget-compute';
import { formatDashboardMetricValue } from '@/lib/dashboard/format-metric-value';
import { buildAllFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import { cn } from '@/lib/utils';
import type { DashboardWidget } from '@/types/dashboard-layout';
import { parseBarChartConfig } from '@/types/dashboard-widgets/bar-chart';
import { getPieChartHeightClassName } from '@/types/dashboard-widgets/pie-chart';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const DATASET_COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82ca9d',
  '#ffc658',
  '#a4de6c',
  '#d0ed57',
  '#8dd1e1',
];

export function BarChartWidget({ widget }: { widget: DashboardWidget }) {
  const t = useTranslations('dashboard.widgets.barChart');
  const tHistoryTable = useTranslations('dashboard.widgets.historyTable');
  const tHistory = useTranslations('dashboard.customizer.historyTable');
  const tLoans = useTranslations('dashboard.loans');
  const tLenders = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const formatter = useFormatter();
  const { loans, toDate, project } = useDashboardData();

  const config = useMemo(() => parseBarChartConfig(widget.config), [widget.config]);

  const fieldOptions = useMemo(
    () => buildAllFilterFieldOptions(project, tLoans, tLenders, commonT),
    [project, tLoans, tLenders, commonT],
  );

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
          return computeBarChart(
            loans,
            config,
            toDate,
            fieldOptions,
            locale,
            (year, month) =>
              formatter.dateTime(new Date(year, month - 1, 1), { month: 'short', year: 'numeric' }),
            t('emptyValue'),
            t('otherCategory'),
            tHistoryTable('untilNow'),
            (key, values) => commonT(key, values),
            (key, values) => t(key, values),
            (metric) => tHistory(`metrics.${metric}`),
          );
        },
      }),
    [loans, config, toDate, fieldOptions, locale, formatter, t, tHistory, tHistoryTable, commonT, widget.id, widget.type],
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
        backgroundColor: DATASET_COLORS[i % DATASET_COLORS.length],
        borderWidth: 1,
        stack: config.seriesLayout === 'stacked' ? 'stack' : undefined,
      })),
    };
  }, [result, config.seriesLayout]);

  const options: ChartOptions<'bar'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
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
              const formatted = formatDashboardMetricValue(
                series.metric,
                Number(raw),
                series.aggregation === 'delta',
              );
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
      <Bar data={chartData} options={options} />
    </div>
  );
}
