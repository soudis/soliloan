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

export const CUMULATIVE_ONLY_METRICS: HistoryTableMetric[] = ['interestRateAvg'];

export function isHistoryMetricColumnValid(metric: HistoryTableMetric, aggregation: HistoryTableAggregation): boolean {
  if (CUMULATIVE_ONLY_METRICS.includes(metric) && aggregation === 'delta') {
    return false;
  }
  return true;
}
