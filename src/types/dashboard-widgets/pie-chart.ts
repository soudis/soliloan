import type { EntityFilter } from '@/types/entity-filters';

import {
  CHART_DATE_GROUPINGS,
  chartDiscriminatorToFlatFields,
  createDefaultChartDiscriminatorConfig,
  DEFAULT_CHART_TOP_N,
  parseChartDiscriminatorConfig,
  type ChartDateGrouping,
  type ChartDiscriminatorConfig,
  type ChartGroupBy,
  type ChartTextTransform,
} from './chart-discriminator';
import { HISTORY_TABLE_METRICS, type HistoryTableMetric } from './history-table';

export type PieChartMeasure = HistoryTableMetric;

export const PIE_CHART_MEASURES = HISTORY_TABLE_METRICS;

export type PieChartMeasureAggregation = 'sum' | 'count' | 'average';

export type PieChartChartVariant = 'pie' | 'donut';

export const PIE_CHART_SIZES = ['small', 'medium', 'big'] as const;

export type PieChartChartSize = (typeof PIE_CHART_SIZES)[number];

/** @deprecated Use ChartDateGrouping from chart-discriminator */
export type PieChartDateGrouping = ChartDateGrouping;

export const PIE_CHART_DATE_GROUPINGS = CHART_DATE_GROUPINGS;

/** @deprecated Use ChartTextTransform from chart-discriminator */
export type PieChartTextTransform = ChartTextTransform;

/** @deprecated Use ChartGroupBy from chart-discriminator */
export type PieChartGroupBy = ChartGroupBy;

export type PieChartWidgetConfig = {
  layoutVersion: 1;
  groupBy: ChartGroupBy;
  numericBuckets?: number[];
  dateGrouping?: ChartDateGrouping;
  textTransform?: ChartTextTransform;
  measure: PieChartMeasure;
  measureAggregation: PieChartMeasureAggregation;
  topNCategories: number;
  chartVariant: PieChartChartVariant;
  chartSize: PieChartChartSize;
  filters: EntityFilter[];
};

export function getPieChartDiscriminator(config: PieChartWidgetConfig): ChartDiscriminatorConfig {
  return {
    groupBy: config.groupBy,
    numericBuckets: config.numericBuckets,
    dateGrouping: config.dateGrouping,
    textTransform: config.textTransform,
    topNCategories: config.topNCategories,
    filters: config.filters,
  };
}

export function getPieChartHeightClassName(size: PieChartChartSize): string {
  switch (size) {
    case 'small':
      return 'h-48 min-h-[160px]';
    case 'big':
      return 'h-112 min-h-[280px]';
    default:
      return 'h-64 min-h-[200px]';
  }
}

export const PIE_CHART_MEASURES_WITHOUT_AVERAGE: PieChartMeasure[] = ['loanCount'];

/** Rate metrics are not summable; only `average`/`count` aggregations are meaningful. */
export const PIE_CHART_MEASURES_WITHOUT_SUM: PieChartMeasure[] = ['interestRateAvg'];

export const DEFAULT_PIE_CHART_TOP_N = DEFAULT_CHART_TOP_N;

export function createDefaultPieChartConfig(): PieChartWidgetConfig {
  const discriminator = createDefaultChartDiscriminatorConfig();
  return {
    layoutVersion: 1,
    ...chartDiscriminatorToFlatFields(discriminator),
    measure: 'balance',
    measureAggregation: 'sum',
    chartVariant: 'pie',
    chartSize: 'medium',
  };
}

export function parsePieChartConfig(config: Record<string, unknown> | undefined): PieChartWidgetConfig {
  const defaults = createDefaultPieChartConfig();
  if (!config || typeof config !== 'object') {
    return defaults;
  }

  const discriminator = parseChartDiscriminatorConfig(config, getPieChartDiscriminator(defaults));

  let measureAggregation: PieChartMeasureAggregation =
    config.measureAggregation === 'count' || config.measureAggregation === 'average'
      ? config.measureAggregation
      : 'sum';

  const measure = PIE_CHART_MEASURES.includes(config.measure as PieChartMeasure)
    ? (config.measure as PieChartMeasure)
    : defaults.measure;

  if (PIE_CHART_MEASURES_WITHOUT_SUM.includes(measure) && measureAggregation === 'sum') {
    measureAggregation = 'average';
  }
  if (PIE_CHART_MEASURES_WITHOUT_AVERAGE.includes(measure) && measureAggregation === 'average') {
    measureAggregation = 'sum';
  }

  const chartVariant: PieChartChartVariant = config.chartVariant === 'donut' ? 'donut' : 'pie';
  const chartSize: PieChartChartSize = PIE_CHART_SIZES.includes(config.chartSize as PieChartChartSize)
    ? (config.chartSize as PieChartChartSize)
    : defaults.chartSize;

  return {
    layoutVersion: 1,
    ...chartDiscriminatorToFlatFields(discriminator),
    measure,
    measureAggregation,
    chartVariant,
    chartSize,
  };
}
