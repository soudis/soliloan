import type { ChartDiscriminatorConfig } from './chart-discriminator';
import { createDefaultChartDiscriminatorConfig, parseChartDiscriminatorConfig } from './chart-discriminator';
import { createDefaultChartSeries, parseChartSeriesList, type ChartSeriesConfig } from './chart-series';
import type { PieChartChartSize } from './pie-chart';
import { PIE_CHART_SIZES } from './pie-chart';

export type BarChartXAxisMode = 'timeline' | 'discriminator';

export type BarChartTimelineConfig = {
  periodMode: 'yearly' | 'monthly';
  periodCount?: number | null;
};

export type BarChartSeriesLayout = 'grouped' | 'stacked';

export type BarChartWidgetConfig = {
  layoutVersion: 1;
  xAxisMode: BarChartXAxisMode;
  timeline: BarChartTimelineConfig;
  discriminator: ChartDiscriminatorConfig;
  series: ChartSeriesConfig[];
  seriesLayout: BarChartSeriesLayout;
  chartSize: PieChartChartSize;
};

export function createDefaultBarChartConfig(): BarChartWidgetConfig {
  return {
    layoutVersion: 1,
    xAxisMode: 'timeline',
    timeline: {
      periodMode: 'yearly',
      periodCount: null,
    },
    discriminator: createDefaultChartDiscriminatorConfig(),
    series: [createDefaultChartSeries()],
    seriesLayout: 'grouped',
    chartSize: 'medium',
  };
}

export function parseBarChartConfig(config: Record<string, unknown> | undefined): BarChartWidgetConfig {
  const defaults = createDefaultBarChartConfig();
  if (!config || typeof config !== 'object') {
    return defaults;
  }

  const xAxisMode: BarChartXAxisMode = config.xAxisMode === 'discriminator' ? 'discriminator' : 'timeline';
  const timelineRaw = config.timeline as BarChartTimelineConfig | undefined;
  const periodMode = timelineRaw?.periodMode === 'monthly' ? 'monthly' : 'yearly';
  const periodCount =
    timelineRaw?.periodCount === null || timelineRaw?.periodCount === undefined
      ? null
      : Number(timelineRaw.periodCount);

  let series = parseChartSeriesList(config.series);
  const seriesLayout: BarChartSeriesLayout = config.seriesLayout === 'stacked' ? 'stacked' : 'grouped';

  if (xAxisMode === 'discriminator') {
    series = series.map((s) => ({ ...s, aggregation: 'cumulative' as const }));
  }
  const chartSize = PIE_CHART_SIZES.includes(config.chartSize as PieChartChartSize)
    ? (config.chartSize as PieChartChartSize)
    : defaults.chartSize;

  return {
    layoutVersion: 1,
    xAxisMode,
    timeline: {
      periodMode,
      periodCount: Number.isFinite(periodCount) ? periodCount : null,
    },
    discriminator: parseChartDiscriminatorConfig(config, defaults.discriminator),
    series: series.length > 0 ? series : defaults.series,
    seriesLayout,
    chartSize,
  };
}
