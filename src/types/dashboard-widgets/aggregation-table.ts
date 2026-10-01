import type { EntityFilter } from '@/types/entity-filters';

import {
  type ChartDateGrouping,
  type ChartDiscriminatorConfig,
  type ChartGroupBy,
  type ChartTextTransform,
  chartDiscriminatorToFlatFields,
  createDefaultChartDiscriminatorConfig,
  parseChartDiscriminatorConfig,
} from './chart-discriminator';
import {
  createDefaultStatDeltaRange,
  defaultStatAggregationForMetric,
  normalizeStatAggregation,
  STAT_DELTA_UNITS,
  STAT_WIDGET_METRICS,
  type StatAggregation,
  type StatDeltaRange,
  type StatDeltaUnit,
  type StatWidgetMetric,
} from './stat-widget';

/** Sort id for the group-label column. Value columns use their own ids. */
export const AGGREGATION_TABLE_GROUP_SORT_ID = '__group__';

export const AGGREGATION_TABLE_SORT_DIRECTIONS = ['asc', 'desc'] as const;

export type AggregationTableSortDirection = (typeof AGGREGATION_TABLE_SORT_DIRECTIONS)[number];

export type AggregationTableColumnConfig = {
  id: string;
  title: string;
  metric: StatWidgetMetric;
  aggregation: StatAggregation;
  deltaRange?: StatDeltaRange;
  colorCodeSign?: boolean;
};

export type AggregationTableWidgetConfig = {
  layoutVersion: 1;
  groupBy: ChartGroupBy;
  numericBuckets?: number[];
  dateGrouping?: ChartDateGrouping;
  textTransform?: ChartTextTransform;
  filters: EntityFilter[];
  columns: AggregationTableColumnConfig[];
  sortColumnId: string;
  sortDirection: AggregationTableSortDirection;
};

export function getAggregationTableDiscriminator(config: AggregationTableWidgetConfig): ChartDiscriminatorConfig {
  return {
    groupBy: config.groupBy,
    numericBuckets: config.numericBuckets,
    dateGrouping: config.dateGrouping,
    textTransform: config.textTransform,
    topNCategories: createDefaultChartDiscriminatorConfig().topNCategories,
    filters: config.filters,
  };
}

export function aggregationDiscriminatorToConfigFields(
  discriminator: ChartDiscriminatorConfig,
): Pick<AggregationTableWidgetConfig, 'groupBy' | 'numericBuckets' | 'dateGrouping' | 'textTransform' | 'filters'> {
  const flat = chartDiscriminatorToFlatFields(discriminator);
  return {
    groupBy: flat.groupBy,
    numericBuckets: flat.numericBuckets,
    dateGrouping: flat.dateGrouping,
    textTransform: flat.textTransform,
    filters: flat.filters,
  };
}

export function createDefaultAggregationTableColumn(
  overrides?: Partial<Pick<AggregationTableColumnConfig, 'metric' | 'aggregation'>>,
): AggregationTableColumnConfig {
  const metric = overrides?.metric ?? 'balance';
  const aggregation = normalizeStatAggregation(
    metric,
    overrides?.aggregation ?? defaultStatAggregationForMetric(metric),
  );
  return {
    id: crypto.randomUUID(),
    title: '',
    metric,
    aggregation,
    deltaRange: aggregation === 'delta' ? createDefaultStatDeltaRange() : undefined,
    colorCodeSign: false,
  };
}

export function createDefaultAggregationTableConfig(): AggregationTableWidgetConfig {
  const discriminator = createDefaultChartDiscriminatorConfig();
  const column = createDefaultAggregationTableColumn({ metric: 'balance', aggregation: 'total' });
  return {
    layoutVersion: 1,
    ...aggregationDiscriminatorToConfigFields(discriminator),
    columns: [column],
    sortColumnId: column.id,
    sortDirection: 'desc',
  };
}

function parseColumn(raw: unknown): AggregationTableColumnConfig {
  const item = (raw ?? {}) as Partial<AggregationTableColumnConfig>;
  const metric = (
    STAT_WIDGET_METRICS.includes(item.metric as StatWidgetMetric) ? item.metric : 'balance'
  ) as StatWidgetMetric;
  const aggregation = normalizeStatAggregation(metric, (item.aggregation ?? 'total') as StatAggregation);
  const amount = Number(item.deltaRange?.amount);
  const unit = STAT_DELTA_UNITS.includes(item.deltaRange?.unit as StatDeltaUnit)
    ? (item.deltaRange?.unit as StatDeltaUnit)
    : 'months';

  return {
    id: String(item.id ?? crypto.randomUUID()),
    title: String(item.title ?? ''),
    metric,
    aggregation,
    deltaRange:
      aggregation === 'delta'
        ? {
            amount: Number.isFinite(amount) && amount > 0 ? amount : 1,
            unit,
          }
        : undefined,
    colorCodeSign: item.colorCodeSign === true,
  };
}

export function resolveAggregationTableSortColumnId(raw: unknown, columns: AggregationTableColumnConfig[]): string {
  if (raw === AGGREGATION_TABLE_GROUP_SORT_ID) {
    return AGGREGATION_TABLE_GROUP_SORT_ID;
  }
  if (typeof raw === 'string' && columns.some((column) => column.id === raw)) {
    return raw;
  }
  return columns[0]?.id ?? AGGREGATION_TABLE_GROUP_SORT_ID;
}

export function parseAggregationTableConfig(config: Record<string, unknown> | undefined): AggregationTableWidgetConfig {
  if (!config || typeof config !== 'object') {
    return createDefaultAggregationTableConfig();
  }

  const defaults = createDefaultAggregationTableConfig();
  const discriminator = parseChartDiscriminatorConfig(config, getAggregationTableDiscriminator(defaults));
  const columns = Array.isArray(config.columns) ? config.columns.map(parseColumn) : defaults.columns;

  return {
    layoutVersion: 1,
    ...aggregationDiscriminatorToConfigFields(discriminator),
    columns,
    sortColumnId: resolveAggregationTableSortColumnId(config.sortColumnId, columns),
    sortDirection: config.sortDirection === 'asc' ? 'asc' : 'desc',
  };
}
