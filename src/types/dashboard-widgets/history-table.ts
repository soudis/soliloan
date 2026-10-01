import { type ChartSeriesConfig, parseChartSeriesList } from './chart-series';

export {
  CUMULATIVE_ONLY_METRICS,
  HISTORY_TABLE_METRICS,
  type HistoryTableAggregation,
  type HistoryTableMetric,
  isHistoryMetricColumnValid,
} from './history-metrics';

export type HistoryTablePeriodMode = 'yearly' | 'monthly';

export type HistoryTableColumnConfig = ChartSeriesConfig;

export type HistoryTableWidgetConfig = {
  layoutVersion: 1;
  periodMode: HistoryTablePeriodMode;
  periodCount?: number | null;
  columns: HistoryTableColumnConfig[];
};

export function createDefaultHistoryTableConfig(): HistoryTableWidgetConfig {
  return {
    layoutVersion: 1,
    periodMode: 'yearly',
    periodCount: null,
    columns: [],
  };
}

export function parseHistoryTableConfig(config: Record<string, unknown> | undefined): HistoryTableWidgetConfig {
  if (!config || typeof config !== 'object') {
    return createDefaultHistoryTableConfig();
  }
  const periodMode = config.periodMode === 'monthly' ? 'monthly' : 'yearly';
  const periodCount =
    config.periodCount === null || config.periodCount === undefined ? null : Number(config.periodCount);
  const columns = parseChartSeriesList(config.columns) as HistoryTableColumnConfig[];

  return {
    layoutVersion: 1,
    periodMode,
    periodCount: Number.isFinite(periodCount) ? periodCount : null,
    columns,
  };
}
