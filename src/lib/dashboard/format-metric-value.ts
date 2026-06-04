import type { HistoryTableMetric } from '@/types/dashboard-widgets/history-table';
import { formatCurrency, formatPercentage } from '@/lib/utils';

export function formatDashboardMetricValue(
  metric: HistoryTableMetric | undefined,
  value: number | null,
  isDelta: boolean,
): string {
  if (value === null || Number.isNaN(value) || !metric) {
    return '–';
  }
  let formatted: string;
  if (metric === 'loanCount') {
    formatted = String(Math.round(value));
  } else if (metric === 'interestRateAvg') {
    formatted = formatPercentage(value);
  } else {
    formatted = formatCurrency(value);
  }
  if (isDelta && value > 0) {
    return `+${formatted}`;
  }
  return formatted;
}
