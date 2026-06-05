import type { EntityFilter } from '@/types/entity-filters';

import { HISTORY_TABLE_METRICS, type HistoryTableMetric } from './history-table';

export type StatWidgetMetric = HistoryTableMetric;

export const STAT_WIDGET_METRICS = HISTORY_TABLE_METRICS;

export type StatDisplayType = 'main' | 'secondary';

export type StatAggregation = 'total' | 'delta';

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
        const aggregation: StatAggregation = stat.aggregation === 'delta' ? 'delta' : 'total';
        return {
          id: String(stat.id ?? crypto.randomUUID()),
          title: String(stat.title ?? ''),
          displayType,
          metric: (STAT_WIDGET_METRICS.includes(stat.metric as StatWidgetMetric)
            ? stat.metric
            : 'balance') as StatWidgetMetric,
          aggregation,
          deltaRange:
            stat.aggregation === 'delta'
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

  const layoutMode: StatWidgetLayoutMode =
    config.layoutMode === 'grid' ? 'grid' : 'flexible';

  return {
    layoutVersion: 1,
    layoutMode,
    gridColumns: parseGridColumns(config.gridColumns, layoutMode),
    stats,
  };
}
