import type { ChartDiscriminatorConfig } from './chart-discriminator';
import { createDefaultChartDiscriminatorConfig, parseChartDiscriminatorConfig } from './chart-discriminator';
import type { BarChartTimelineConfig, BarChartXAxisMode } from './bar-chart';
import {
  createDefaultLineChartSeries,
  parseLineChartSeriesList,
  type LineChartSeriesConfig,
} from './line-chart-series';
import type { PieChartChartSize } from './pie-chart';
import { PIE_CHART_SIZES } from './pie-chart';

export type LineChartWidgetConfig = {
  layoutVersion: 1;
  xAxisMode: BarChartXAxisMode;
  timeline: BarChartTimelineConfig;
  discriminator: ChartDiscriminatorConfig;
  series: LineChartSeriesConfig[];
  beginAtZero: boolean;
  chartSize: PieChartChartSize;
};

export function createDefaultLineChartConfig(): LineChartWidgetConfig {
  return {
    layoutVersion: 1,
    xAxisMode: 'timeline',
    timeline: {
      periodMode: 'yearly',
      periodCount: null,
    },
    discriminator: createDefaultChartDiscriminatorConfig(),
    series: [createDefaultLineChartSeries()],
    beginAtZero: true,
    chartSize: 'medium',
  };
}

export function parseLineChartConfig(config: Record<string, unknown> | undefined): LineChartWidgetConfig {
  const defaults = createDefaultLineChartConfig();
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

  let series = parseLineChartSeriesList(config.series);
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
    beginAtZero: config.beginAtZero !== false,
    chartSize,
  };
}
