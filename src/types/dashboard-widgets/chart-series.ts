import type { EntityFilter } from '@/types/entity-filters';

import {
  CUMULATIVE_ONLY_METRICS,
  HISTORY_TABLE_METRICS,
  type HistoryTableAggregation,
  type HistoryTableMetric,
  isHistoryMetricColumnValid,
} from './history-table';

export type ChartSeriesMetric = HistoryTableMetric;

export const CHART_SERIES_METRICS = HISTORY_TABLE_METRICS;

export type ChartSeriesAggregation = HistoryTableAggregation;

export type ChartSeriesConfig = {
  id: string;
  title: string;
  metric: ChartSeriesMetric;
  aggregation: ChartSeriesAggregation;
  filters: EntityFilter[];
};

export const CHART_CUMULATIVE_ONLY_METRICS = CUMULATIVE_ONLY_METRICS;

export function isChartSeriesValid(metric: ChartSeriesMetric, aggregation: ChartSeriesAggregation): boolean {
  return isHistoryMetricColumnValid(metric, aggregation);
}

export function parseChartSeriesList(raw: unknown): ChartSeriesConfig[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((col) => {
    const item = col as ChartSeriesConfig;
    return {
      id: String(item.id ?? crypto.randomUUID()),
      title: String(item.title ?? ''),
      metric: (CHART_SERIES_METRICS.includes(item.metric as ChartSeriesMetric)
        ? item.metric
        : 'balance') as ChartSeriesMetric,
      aggregation: (item.aggregation === 'delta' ? 'delta' : 'cumulative') as ChartSeriesAggregation,
      filters: Array.isArray(item.filters) ? (item.filters as EntityFilter[]) : [],
    };
  });
}

export function createDefaultChartSeries(
  overrides?: Partial<Pick<ChartSeriesConfig, 'metric' | 'aggregation'>>,
): ChartSeriesConfig {
  return {
    id: crypto.randomUUID(),
    title: '',
    metric: overrides?.metric ?? 'balance',
    aggregation: overrides?.aggregation ?? 'cumulative',
    filters: [],
  };
}
