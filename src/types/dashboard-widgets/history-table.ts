import type { EntityFilter } from '@/types/entity-filters';

export const HISTORY_TABLE_METRICS = [
  'balance',
  'deposits',
  'withdrawals',
  'notReclaimed',
  'interest',
  'interestPaid',
  'interestError',
  'contractAmount',
  'loanCount',
  'interestRateAvg',
] as const;

export type HistoryTableMetric = (typeof HISTORY_TABLE_METRICS)[number];

export type HistoryTableAggregation = 'delta' | 'cumulative';

export type HistoryTablePeriodMode = 'yearly' | 'monthly';

export type HistoryTableColumnConfig = {
  id: string;
  title: string;
  metric: HistoryTableMetric;
  aggregation: HistoryTableAggregation;
  filters: EntityFilter[];
};

export type HistoryTableWidgetConfig = {
  layoutVersion: 1;
  periodMode: HistoryTablePeriodMode;
  periodCount?: number | null;
  columns: HistoryTableColumnConfig[];
};

export const CUMULATIVE_ONLY_METRICS: HistoryTableMetric[] = ['interestRateAvg'];

export function isHistoryMetricColumnValid(
  metric: HistoryTableMetric,
  aggregation: HistoryTableAggregation,
): boolean {
  if (CUMULATIVE_ONLY_METRICS.includes(metric) && aggregation === 'delta') {
    return false;
  }
  return true;
}

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
    config.periodCount === null || config.periodCount === undefined
      ? null
      : Number(config.periodCount);
  const columns = Array.isArray(config.columns)
    ? (config.columns as HistoryTableColumnConfig[]).map((col) => ({
        id: String(col.id ?? crypto.randomUUID()),
        title: String(col.title ?? ''),
        metric: (HISTORY_TABLE_METRICS.includes(col.metric as HistoryTableMetric)
          ? col.metric
          : 'balance') as HistoryTableMetric,
        aggregation: (col.aggregation === 'delta' ? 'delta' : 'cumulative') as HistoryTableAggregation,
        filters: Array.isArray(col.filters) ? (col.filters as EntityFilter[]) : [],
      }))
    : [];

  return {
    layoutVersion: 1,
    periodMode,
    periodCount: Number.isFinite(periodCount) ? periodCount : null,
    columns,
  };
}
