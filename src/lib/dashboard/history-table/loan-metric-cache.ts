import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import type { LoanMonthlyNumbers } from '@/types/dashboard';

import { lookupCumulativeAtDate, type CumulativeTimelineEntry } from './cumulative-timeline';
import { getCumulativeNumbers, getPeriodNumbers, type HistoryPeriod } from './rollup-period';

export type LoanMetricCache = {
  cumulativeByPeriodKey: Map<string, LoanMonthlyNumbers>;
  periodByPeriodKey: Map<string, LoanMonthlyNumbers | null>;
};

export type LoanMetricCacheMap = Map<string, LoanMetricCache>;

function getLoanTimeline(loan: DashboardLoan): CumulativeTimelineEntry[] | undefined {
  return loan.cumulativeTimeline;
}

function cumulativeForPeriod(loan: DashboardLoan, period: HistoryPeriod): LoanMonthlyNumbers {
  const timeline = getLoanTimeline(loan);
  if (timeline?.length) {
    return lookupCumulativeAtDate(timeline, period.periodEnd);
  }
  return getCumulativeNumbers(loan, period);
}

export function buildLoanMetricCache(
  loan: DashboardLoan,
  periods: HistoryPeriod[],
  mode: 'yearly' | 'monthly',
): LoanMetricCache {
  const cumulativeByPeriodKey = new Map<string, LoanMonthlyNumbers>();
  const periodByPeriodKey = new Map<string, LoanMonthlyNumbers | null>();

  for (const period of periods) {
    cumulativeByPeriodKey.set(period.key, cumulativeForPeriod(loan, period));
    periodByPeriodKey.set(period.key, getPeriodNumbers(loan, period, mode));
  }

  return { cumulativeByPeriodKey, periodByPeriodKey };
}

export function buildAllLoanMetricCaches(
  loans: DashboardLoan[],
  periods: HistoryPeriod[],
  mode: 'yearly' | 'monthly',
): LoanMetricCacheMap {
  const map: LoanMetricCacheMap = new Map();
  for (const loan of loans) {
    map.set(loan.id, buildLoanMetricCache(loan, periods, mode));
  }
  return map;
}

export function collectPeriodsForMetricCaches(
  periods: HistoryPeriod[],
  precedingPeriods: HistoryPeriod[],
): HistoryPeriod[] {
  const byKey = new Map<string, HistoryPeriod>();
  for (const period of [...periods, ...precedingPeriods]) {
    byKey.set(period.key, period);
  }
  return [...byKey.values()];
}
