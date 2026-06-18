import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { loanActiveAtPeriodEnd } from '@/lib/entity-filters/get-filter-value';
import type { HistoryTableMetric } from '@/types/dashboard-widgets/history-table';

import { buildStatPeriodAtDate } from '../stat-widget/build-stat-period';
import { getCumulativeNumbers, getPeriodNumbers } from '../history-table/rollup-period';

export function getLoanMetricValue(loan: DashboardLoan, metric: HistoryTableMetric, toDate: Date): number | null {
  const period = buildStatPeriodAtDate(toDate);
  const periodNumbers = getPeriodNumbers(loan, period, 'monthly');
  const cumulative = getCumulativeNumbers(loan, period);

  switch (metric) {
    case 'loanCount':
      return loanActiveAtPeriodEnd(loan, period.periodEnd) ? 1 : 0;
    case 'contractAmount':
      return loanActiveAtPeriodEnd(loan, period.periodEnd) ? Number(loan.amount) : null;
    case 'interestRateAvg': {
      if (!periodNumbers || periodNumbers.end <= 0) {
        return null;
      }
      return Number(loan.interestRate);
    }
    case 'balance':
      return cumulative.end;
    case 'deposits':
    case 'withdrawals':
    case 'notReclaimed':
    case 'interest':
    case 'interestPaid':
    case 'interestError':
      return cumulative[metric];
    default:
      return null;
  }
}
