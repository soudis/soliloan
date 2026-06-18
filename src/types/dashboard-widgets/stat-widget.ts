import type { EntityFilter } from '@/types/entity-filters';

import { HISTORY_TABLE_METRICS, type HistoryTableMetric } from './history-table';

export const STAT_ONLY_METRICS = ['lenderCount', 'loanTerm', 'repaymentPeriod'] as const;

export type StatOnlyMetric = (typeof STAT_ONLY_METRICS)[number];

export type HistoryTableStatMetric = HistoryTableMetric;

export const STAT_WIDGET_METRICS = [...HISTORY_TABLE_METRICS, ...STAT_ONLY_METRICS] as const;

export type StatWidgetMetric = (typeof STAT_WIDGET_METRICS)[number];

export type StatDisplayType = 'main' | 'secondary';

export const STAT_AGGREGATIONS = ['total', 'delta', 'average', 'median', 'averageByLender', 'medianByLender'] as const;

export type StatAggregation = (typeof STAT_AGGREGATIONS)[number];

export const STAT_DELTA_UNITS = ['days', 'weeks', 'months', 'years'] as const;

export type StatDeltaUnit = (typeof STAT_DELTA_UNITS)[number];

export type StatDeltaRange = {
  amount: number;
  unit: StatDeltaUnit;
};

export type StatItemConfig = {
  id: string;
  title: string;
  displayType: StatDisplayType;
  metric: StatWidgetMetric;
  aggregation: StatAggregation;
  deltaRange?: StatDeltaRange;
  colorCodeSign?: boolean;
  filters: EntityFilter[];
};

export const STAT_WIDGET_LAYOUT_MODES = ['flexible', 'grid'] as const;

export type StatWidgetLayoutMode = (typeof STAT_WIDGET_LAYOUT_MODES)[number];

export const DEFAULT_STAT_GRID_COLUMNS = 2;

export const STAT_GRID_COLUMNS_MIN = 1;

export const STAT_GRID_COLUMNS_MAX = 4;

export type StatWidgetConfig = {
  layoutVersion: 1;
  layoutMode: StatWidgetLayoutMode;
  gridColumns?: number;
  stats: StatItemConfig[];
};

export const CUMULATIVE_ONLY_STAT_METRICS: StatWidgetMetric[] = ['interestRateAvg'];

export const STAT_METRICS_TOTAL_ONLY: StatWidgetMetric[] = ['loanCount', 'lenderCount'];

export const STAT_METRICS_AVG_MEDIAN_ONLY: StatWidgetMetric[] = ['loanTerm', 'repaymentPeriod'];

export const STAT_METRICS_WITHOUT_BY_LENDER: StatWidgetMetric[] = [
  'interestRateAvg',
  'loanTerm',
  'repaymentPeriod',
  'loanCount',
  'lenderCount',
];

export function isHistoryTableStatMetric(metric: StatWidgetMetric): metric is HistoryTableStatMetric {
  return !(STAT_ONLY_METRICS as readonly string[]).includes(metric);
}

export function isStatAvgMedianAggregation(aggregation: StatAggregation): boolean {
  return aggregation === 'average' || aggregation === 'median';
}

export function isStatByLenderAggregation(aggregation: StatAggregation): boolean {
  return aggregation === 'averageByLender' || aggregation === 'medianByLender';
}

export function isStatAggregateAggregation(aggregation: StatAggregation): boolean {
  return isStatAvgMedianAggregation(aggregation) || isStatByLenderAggregation(aggregation);
}

export function supportsStatByLenderAggregation(metric: StatWidgetMetric): boolean {
  return !STAT_METRICS_WITHOUT_BY_LENDER.includes(metric);
}

export function isStatAggregationValidForMetric(metric: StatWidgetMetric, aggregation: StatAggregation): boolean {
  if (CUMULATIVE_ONLY_STAT_METRICS.includes(metric) && aggregation === 'delta') {
    return false;
  }
  if (STAT_METRICS_TOTAL_ONLY.includes(metric) && aggregation !== 'total') {
    return false;
  }
  if (STAT_METRICS_AVG_MEDIAN_ONLY.includes(metric) && !isStatAvgMedianAggregation(aggregation)) {
    return false;
  }
  if (isStatByLenderAggregation(aggregation) && !supportsStatByLenderAggregation(metric)) {
    return false;
  }
  return true;
}

export function normalizeStatAggregation(metric: StatWidgetMetric, aggregation: StatAggregation): StatAggregation {
  return isStatAggregationValidForMetric(metric, aggregation) ? aggregation : defaultStatAggregationForMetric(metric);
}

export function defaultStatAggregationForMetric(metric: StatWidgetMetric): StatAggregation {
  if (STAT_METRICS_AVG_MEDIAN_ONLY.includes(metric)) {
    return 'average';
  }
  return 'total';
}

export function createDefaultStatDeltaRange(): StatDeltaRange {
  return { amount: 1, unit: 'months' };
}

export function createDefaultStatWidgetConfig(): StatWidgetConfig {
  return {
    layoutVersion: 1,
    layoutMode: 'flexible',
    stats: [],
  };
}

function parseGridColumns(raw: unknown, layoutMode: StatWidgetLayoutMode): number | undefined {
  if (layoutMode !== 'grid') {
    return undefined;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    return DEFAULT_STAT_GRID_COLUMNS;
  }
  return Math.min(STAT_GRID_COLUMNS_MAX, Math.max(STAT_GRID_COLUMNS_MIN, Math.round(n)));
}

function parseStatAggregation(raw: unknown, metric: StatWidgetMetric): StatAggregation {
  const aggregation: StatAggregation =
    raw === 'delta'
      ? 'delta'
      : raw === 'average'
        ? 'average'
        : raw === 'median'
          ? 'median'
          : raw === 'averageByLender'
            ? 'averageByLender'
            : raw === 'medianByLender'
              ? 'medianByLender'
              : 'total';
  return normalizeStatAggregation(metric, aggregation);
}

export function parseStatWidgetConfig(config: Record<string, unknown> | undefined): StatWidgetConfig {
  if (!config || typeof config !== 'object') {
    return createDefaultStatWidgetConfig();
  }

  const stats = Array.isArray(config.stats)
    ? (config.stats as StatItemConfig[]).map((stat) => {
        const amount = Number(stat.deltaRange?.amount);
        const unit = STAT_DELTA_UNITS.includes(stat.deltaRange?.unit as StatDeltaUnit)
          ? (stat.deltaRange?.unit as StatDeltaUnit)
          : 'months';
        const displayType: StatDisplayType = stat.displayType === 'secondary' ? 'secondary' : 'main';
        const metric = (
          STAT_WIDGET_METRICS.includes(stat.metric as StatWidgetMetric) ? stat.metric : 'balance'
        ) as StatWidgetMetric;
        const aggregation = parseStatAggregation(stat.aggregation, metric);
        return {
          id: String(stat.id ?? crypto.randomUUID()),
          title: String(stat.title ?? ''),
          displayType,
          metric,
          aggregation,
          deltaRange:
            aggregation === 'delta'
              ? {
                  amount: Number.isFinite(amount) && amount > 0 ? amount : 1,
                  unit,
                }
              : undefined,
          colorCodeSign: stat.colorCodeSign === true,
          filters: Array.isArray(stat.filters) ? (stat.filters as EntityFilter[]) : [],
        };
      })
    : [];

  const layoutMode: StatWidgetLayoutMode = config.layoutMode === 'grid' ? 'grid' : 'flexible';

  return {
    layoutVersion: 1,
    layoutMode,
    gridColumns: parseGridColumns(config.gridColumns, layoutMode),
    stats,
  };
}
