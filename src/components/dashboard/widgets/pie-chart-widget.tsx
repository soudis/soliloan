'use client';

import { ArcElement, type ChartData, Chart as ChartJS, type ChartOptions, Legend, Tooltip } from 'chart.js';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Pie } from 'react-chartjs-2';

import { useDashboardData } from '@/components/dashboard/dashboard-data-provider';
import { useAnimatedChartData } from '@/hooks/use-animated-chart-data';
import { chartColorAtIndex } from '@/lib/dashboard/chart/chart-dataset-colors';
import { DASHBOARD_CHART_ANIMATION } from '@/lib/dashboard/chart-animation';
import { formatDashboardMetricValue } from '@/lib/dashboard/format-metric-value';
import { computePieChart } from '@/lib/dashboard/pie-chart/compute-pie-chart';
import { profileWidgetCompute } from '@/lib/dashboard/profile-widget-compute';
import { cn } from '@/lib/utils';
import type { DashboardWidget } from '@/types/dashboard-layout';
import { getPieChartHeightClassName, parsePieChartConfig } from '@/types/dashboard-widgets/pie-chart';

ChartJS.register(ArcElement, Tooltip, Legend);

export function PieChartWidget({ widget }: { widget: DashboardWidget }) {
  const t = useTranslations('dashboard.widgets.pieChart');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const { loans, toDate, fieldOptions } = useDashboardData();

  const config = useMemo(() => parsePieChartConfig(widget.config), [widget.config]);

  const result = useMemo(
    () =>
      profileWidgetCompute({
        widgetType: widget.type,
        widgetId: widget.id,
        loanCount: loans.length,
        compute: () =>
          computePieChart(
            loans,
            config,
            toDate,
            fieldOptions,
            locale,
            t('emptyValue'),
            t('otherCategory'),
            (key, values) => commonT(key, values),
            (key, values) => t(key, values),
          ),
      }),
    [loans, config, toDate, fieldOptions, locale, t, commonT, widget.id, widget.type],
  );

  const chartData = useMemo<ChartData<'pie'>>(
    () => ({
      labels: result.slices.map((s) => s.label),
      datasets: [
        {
          data: result.slices.map((s) => s.value),
          backgroundColor: result.slices.map((_, i) => chartColorAtIndex(i)),
          borderWidth: 1,
        },
      ],
    }),
    [result.slices],
  );

  const animatedChartData = useAnimatedChartData(chartData);

  const options: ChartOptions<'pie'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: DASHBOARD_CHART_ANIMATION,
      cutout: config.chartVariant === 'donut' ? '55%' : '0%',
      plugins: {
        legend: {
          position: 'bottom' as const,
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = Number(context.raw) || 0;
              const total = result.total || 1;
              const percentage = Math.round((value / total) * 100);
              const formatted = formatDashboardMetricValue(config.measure, value, false);
              return `${label}: ${formatted} (${percentage}%)`;
            },
          },
        },
      },
    }),
    [config.chartVariant, config.measure, result.total],
  );

  if (result.slices.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('emptyData')}</p>;
  }

  return (
    <div className={cn('w-full', getPieChartHeightClassName(config.chartSize))}>
      {animatedChartData ? <Pie data={animatedChartData} options={options} /> : null}
    </div>
  );
}
