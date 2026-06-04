import moment from 'moment';
import type { HistoryPeriod } from '@/lib/dashboard/history-table/rollup-period';
import type { StatDeltaRange } from '@/types/dashboard-widgets/stat-widget';

export function buildStatPeriodAtDate(end: Date): HistoryPeriod {
  const periodEnd = moment(end).endOf('day');
  return {
    key: 'stat-end',
    label: '',
    year: periodEnd.year(),
    month: periodEnd.month() + 1,
    periodStart: periodEnd.clone().startOf('month').toDate(),
    periodEnd: periodEnd.toDate(),
    isPartial: true,
  };
}

export function buildStatBaselinePeriodBefore(rangeStart: Date): HistoryPeriod {
  const baselineEnd = moment(rangeStart).subtract(1, 'day').endOf('day');
  return buildStatPeriodAtDate(baselineEnd.toDate());
}

export function getStatDeltaRangeStart(toDate: Date, range: StatDeltaRange): Date {
  return moment(toDate).subtract(range.amount, range.unit).startOf('day').toDate();
}
