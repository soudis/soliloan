import { formatDurationDays } from '@/lib/format-duration';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import type { StatWidgetMetric } from '@/types/dashboard-widgets/stat-widget';

export function formatDashboardMetricValue(
  metric: StatWidgetMetric | undefined,
  value: number | null,
  isDelta: boolean,
  durationT?: (key: string, values?: Record<string, number>) => string,
): string {
  if (value === null || Number.isNaN(value) || !metric) {
    return '–';
  }
  let formatted: string;
  if (metric === 'loanCount' || metric === 'lenderCount') {
    formatted = String(Math.round(value));
  } else if (metric === 'loanTerm' || metric === 'repaymentPeriod') {
    formatted = durationT ? formatDurationDays(value, durationT) : String(Math.round(value));
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
