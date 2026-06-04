import type { EntityFilter } from '@/types/entity-filters';

import { HISTORY_TABLE_METRICS, type HistoryTableMetric } from './history-table';

export type PieChartMeasure = HistoryTableMetric;

export const PIE_CHART_MEASURES = HISTORY_TABLE_METRICS;

export type PieChartMeasureAggregation = 'sum' | 'count' | 'average';

export type PieChartChartVariant = 'pie' | 'donut';

export const PIE_CHART_SIZES = ['small', 'medium', 'big'] as const;

export type PieChartChartSize = (typeof PIE_CHART_SIZES)[number];

export const PIE_CHART_DATE_GROUPINGS = ['year', 'month', 'monthOfYear', 'weekOfYear', 'dayOfWeek'] as const;

export type PieChartDateGrouping = (typeof PIE_CHART_DATE_GROUPINGS)[number];

export type PieChartTextTransform =
  | { kind: 'firstChars'; count: number }
  | { kind: 'lastChars'; count: number }
  | { kind: 'firstWord' }
  | { kind: 'charCount' };

export type PieChartGroupBy = {
  entity: 'loan' | 'lender';
  field: string;
};

export type PieChartWidgetConfig = {
  layoutVersion: 1;
  groupBy: PieChartGroupBy;
  numericBuckets?: number[];
  dateGrouping?: PieChartDateGrouping;
  textTransform?: PieChartTextTransform;
  measure: PieChartMeasure;
  measureAggregation: PieChartMeasureAggregation;
  topNCategories: number;
  chartVariant: PieChartChartVariant;
  chartSize: PieChartChartSize;
  filters: EntityFilter[];
};

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

export const DEFAULT_PIE_CHART_TOP_N = 8;

export function createDefaultPieChartConfig(): PieChartWidgetConfig {
  return {
    layoutVersion: 1,
    groupBy: { entity: 'loan', field: 'status' },
    measure: 'balance',
    measureAggregation: 'sum',
    topNCategories: DEFAULT_PIE_CHART_TOP_N,
    chartVariant: 'pie',
    chartSize: 'medium',
    filters: [],
  };
}

function parseNumericBuckets(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    return undefined;
  }
  const parsed = raw
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const unique: number[] = [];
  for (const n of parsed) {
    if (unique.length === 0 || unique[unique.length - 1] !== n) {
      unique.push(n);
    }
  }
  return unique.length > 0 ? unique : undefined;
}

function parseTextTransform(raw: unknown): PieChartTextTransform | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const t = raw as PieChartTextTransform;
  if (t.kind === 'firstWord' || t.kind === 'charCount') {
    return { kind: t.kind };
  }
  if (t.kind === 'firstChars' || t.kind === 'lastChars') {
    const count = Number((t as { count?: number }).count);
    if (Number.isFinite(count) && count > 0) {
      return { kind: t.kind, count: Math.floor(count) };
    }
  }
  return undefined;
}

export function parsePieChartConfig(config: Record<string, unknown> | undefined): PieChartWidgetConfig {
  const defaults = createDefaultPieChartConfig();
  if (!config || typeof config !== 'object') {
    return defaults;
  }

  const groupByRaw = config.groupBy as PieChartGroupBy | undefined;
  const entity = groupByRaw?.entity === 'lender' ? 'lender' : 'loan';
  const field = typeof groupByRaw?.field === 'string' ? groupByRaw.field : defaults.groupBy.field;

  const dateGrouping = PIE_CHART_DATE_GROUPINGS.includes(config.dateGrouping as PieChartDateGrouping)
    ? (config.dateGrouping as PieChartDateGrouping)
    : undefined;

  const measureAggregation: PieChartMeasureAggregation =
    config.measureAggregation === 'count' || config.measureAggregation === 'average'
      ? config.measureAggregation
      : 'sum';

  const measure = PIE_CHART_MEASURES.includes(config.measure as PieChartMeasure)
    ? (config.measure as PieChartMeasure)
    : defaults.measure;

  const topN = Number(config.topNCategories);
  const chartVariant: PieChartChartVariant = config.chartVariant === 'donut' ? 'donut' : 'pie';
  const chartSize: PieChartChartSize = PIE_CHART_SIZES.includes(config.chartSize as PieChartChartSize)
    ? (config.chartSize as PieChartChartSize)
    : defaults.chartSize;

  return {
    layoutVersion: 1,
    groupBy: { entity, field },
    numericBuckets: parseNumericBuckets(config.numericBuckets),
    dateGrouping,
    textTransform: parseTextTransform(config.textTransform),
    measure,
    measureAggregation,
    topNCategories: Number.isFinite(topN) && topN >= 1 && topN <= 50 ? Math.floor(topN) : DEFAULT_PIE_CHART_TOP_N,
    chartVariant,
    chartSize,
    filters: Array.isArray(config.filters) ? (config.filters as EntityFilter[]) : [],
  };
}
