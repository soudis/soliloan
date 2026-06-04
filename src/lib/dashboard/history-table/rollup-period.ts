import moment from 'moment';

import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import type { LoanMonthlyHistory, LoanMonthlyNumbers } from '@/types/dashboard';
import { getLoanStatusAtPeriod, type PeriodSnapshot } from '@/lib/entity-filters/get-filter-value';

export type HistoryPeriod = {
  key: string;
  label: string;
  year: number;
  month?: number;
  periodStart: Date;
  periodEnd: Date;
  /** True when the period is cut off at `toDate` (current year or month). */
  isPartial: boolean;
};

function naturalPeriodEnd(year: number, month: number | undefined, mode: 'yearly' | 'monthly'): moment.Moment {
  if (mode === 'yearly') {
    return moment({ year }).endOf('year');
  }
  return moment({ year, month: (month ?? 1) - 1 }).endOf('month');
}

function ensureCurrentPeriodKey(
  periods: { year: number; month?: number }[],
  mode: 'yearly' | 'monthly',
  toDate: Date,
): { year: number; month?: number }[] {
  const at = moment(toDate);
  const current =
    mode === 'yearly'
      ? { year: at.year() }
      : { year: at.year(), month: at.month() + 1 };

  const hasCurrent = periods.some(
    (p) => p.year === current.year && (mode === 'yearly' || p.month === current.month),
  );
  if (hasCurrent) {
    return periods;
  }

  return [...periods, current].sort((a, b) => {
    if (a.year !== b.year) {
      return a.year - b.year;
    }
    return (a.month ?? 0) - (b.month ?? 0);
  });
}

const emptyNumbers = (): LoanMonthlyNumbers => ({
  begin: 0,
  end: 0,
  withdrawals: 0,
  deposits: 0,
  notReclaimed: 0,
  interestPaid: 0,
  interest: 0,
  interestError: 0,
});

export function collectPeriodKeysFromLoans(
  loans: DashboardLoan[],
  mode: 'yearly' | 'monthly',
): { year: number; month?: number }[] {
  const keys = new Map<string, { year: number; month?: number }>();

  for (const loan of loans) {
    for (const yearStr of Object.keys(loan.history)) {
      const year = Number(yearStr);
      if (mode === 'yearly') {
        keys.set(String(year), { year });
      } else {
        for (const monthStr of Object.keys(loan.history[year] ?? {})) {
          const month = Number(monthStr);
          keys.set(`${year}-${month}`, { year, month });
        }
      }
    }
  }

  return [...keys.values()].sort((a, b) => {
    if (a.year !== b.year) {
      return a.year - b.year;
    }
    return (a.month ?? 0) - (b.month ?? 0);
  });
}

export function limitPeriods(
  periods: { year: number; month?: number }[],
  mode: 'yearly' | 'monthly',
  periodCount: number | null | undefined,
  toDate: Date,
): { year: number; month?: number }[] {
  if (periods.length === 0) {
    return [];
  }

  if (mode === 'yearly') {
    if (!periodCount) {
      return periods;
    }
    const endYear = moment(toDate).year();
    const startYear = endYear - periodCount + 1;
    return periods.filter((p) => p.year >= startYear && p.year <= endYear);
  }

  const maxMonths = periodCount ? Math.min(periodCount, 24) : 24;
  const end = moment(toDate).startOf('month');
  const start = end.clone().subtract(maxMonths - 1, 'months');
  return periods.filter((p) => {
    if (!p.month) {
      return false;
    }
    const m = moment({ year: p.year, month: p.month - 1 });
    return m.isSameOrAfter(start, 'month') && m.isSameOrBefore(end, 'month');
  });
}

/** Period immediately before `period` — used as baseline for stock-count deltas on the first visible row. */
export function buildPrecedingPeriodForStockDelta(
  period: HistoryPeriod,
  mode: 'yearly' | 'monthly',
): HistoryPeriod {
  if (mode === 'yearly') {
    const year = period.year - 1;
    return {
      key: String(year),
      label: '',
      year,
      periodStart: moment({ year }).startOf('year').toDate(),
      periodEnd: moment({ year }).endOf('year').toDate(),
      isPartial: false,
    };
  }
  const prev = moment({ year: period.year, month: (period.month ?? 1) - 1 }).subtract(1, 'month');
  const year = prev.year();
  const month = prev.month() + 1;
  return {
    key: `${year}-${month}`,
    label: '',
    year,
    month,
    periodStart: prev.startOf('month').toDate(),
    periodEnd: prev.endOf('month').toDate(),
    isPartial: false,
  };
}

export function buildHistoryPeriods(
  loans: DashboardLoan[],
  mode: 'yearly' | 'monthly',
  periodCount: number | null | undefined,
  toDate: Date,
  formatMonthLabel: (year: number, month: number) => string,
): HistoryPeriod[] {
  const collected = collectPeriodKeysFromLoans(loans, mode);
  const withCurrent = ensureCurrentPeriodKey(collected, mode, toDate);
  const limited = limitPeriods(withCurrent, mode, periodCount, toDate);
  const toDateMoment = moment(toDate).endOf('day');

  return limited.map((p) => {
    if (mode === 'yearly') {
      const periodStart = moment({ year: p.year }).startOf('year').toDate();
      const naturalEnd = naturalPeriodEnd(p.year, undefined, 'yearly');
      const periodEnd = moment.min(naturalEnd, toDateMoment).toDate();
      const isPartial = toDateMoment.isBefore(naturalEnd, 'day');
      return {
        key: String(p.year),
        label: String(p.year),
        year: p.year,
        periodStart,
        periodEnd,
        isPartial,
      };
    }
    const month = p.month ?? 1;
    const periodStart = moment({ year: p.year, month: month - 1 }).startOf('month').toDate();
    const naturalEnd = naturalPeriodEnd(p.year, month, 'monthly');
    const periodEnd = moment.min(naturalEnd, toDateMoment).toDate();
    const isPartial = toDateMoment.isBefore(naturalEnd, 'day');
    return {
      key: `${p.year}-${month}`,
      label: formatMonthLabel(p.year, month),
      year: p.year,
      month,
      periodStart,
      periodEnd,
      isPartial,
    };
  });
}

function getMonthEntry(history: LoanMonthlyHistory, year: number, month: number): LoanMonthlyNumbers | null {
  return history[year]?.[month] ?? null;
}

export function rollupYearFromHistory(
  history: LoanMonthlyHistory,
  year: number,
  periodEnd?: Date,
): LoanMonthlyNumbers {
  const months = history[year];
  if (!months) {
    return emptyNumbers();
  }
  const periodEndMoment = periodEnd ? moment(periodEnd).endOf('day') : null;
  const monthKeys = Object.keys(months)
    .map(Number)
    .sort((a, b) => a - b)
    .filter((month) => {
      if (!periodEndMoment) {
        return true;
      }
      const monthEnd = moment({ year, month: month - 1 }).endOf('month');
      return !monthEnd.isAfter(periodEndMoment, 'day');
    });

  if (monthKeys.length === 0) {
    return emptyNumbers();
  }
  const firstMonth = monthKeys[0];
  const lastMonth = monthKeys[monthKeys.length - 1];
  const first = firstMonth !== undefined ? months[firstMonth] : null;
  const last = lastMonth !== undefined ? months[lastMonth] : null;
  if (!first || !last) {
    return emptyNumbers();
  }

  let withdrawals = 0;
  let deposits = 0;
  let notReclaimed = 0;
  let interestPaid = 0;
  let interest = 0;
  let interestError = 0;

  for (const m of monthKeys) {
    const entry = months[m];
    if (!entry) {
      continue;
    }
    withdrawals += entry.withdrawals;
    deposits += entry.deposits;
    notReclaimed += entry.notReclaimed;
    interestPaid += entry.interestPaid;
    interest += entry.interest;
    interestError += entry.interestError;
  }

  return {
    begin: first.begin,
    end: last.end,
    withdrawals,
    deposits,
    notReclaimed,
    interestPaid,
    interest,
    interestError,
  };
}

export function getPeriodNumbers(
  loan: DashboardLoan,
  period: HistoryPeriod,
  mode: 'yearly' | 'monthly',
): LoanMonthlyNumbers | null {
  if (mode === 'yearly') {
    if (!loan.history[period.year]) {
      return null;
    }
    return rollupYearFromHistory(loan.history, period.year, period.periodEnd);
  }
  if (!period.month) {
    return null;
  }
  return getMonthEntry(loan.history, period.year, period.month);
}

export function getCumulativeNumbers(loan: DashboardLoan, period: HistoryPeriod): LoanMonthlyNumbers {
  const result = emptyNumbers();
  let firstBegin: number | null = null;
  const periodEnd = moment(period.periodEnd);

  const yearKeys = Object.keys(loan.history)
    .map(Number)
    .sort((a, b) => a - b);

  for (const year of yearKeys) {
    const months = loan.history[year];
    if (!months) {
      continue;
    }
    const monthKeys = Object.keys(months)
      .map(Number)
      .sort((a, b) => a - b);
    for (const month of monthKeys) {
      const monthEnd = moment({ year, month: month - 1 }).endOf('month');
      if (monthEnd.isAfter(periodEnd)) {
        continue;
      }
      const entry = months[month];
      if (!entry) {
        continue;
      }
      if (firstBegin === null) {
        firstBegin = entry.begin;
      }
      result.withdrawals += entry.withdrawals;
      result.deposits += entry.deposits;
      result.notReclaimed += entry.notReclaimed;
      result.interestPaid += entry.interestPaid;
      result.interest += entry.interest;
      result.interestError += entry.interestError;
      result.end = entry.end;
    }
  }

  result.begin = firstBegin ?? 0;
  return result;
}

export function buildPeriodSnapshot(
  loan: DashboardLoan & { transactions?: { date: Date }[] },
  period: HistoryPeriod,
  mode: 'yearly' | 'monthly',
): PeriodSnapshot {
  const status = getLoanStatusAtPeriod(loan, period.periodEnd);
  const numbers = getPeriodNumbers(loan, period, mode);
  if (!numbers) {
    return { ...emptyNumbers(), status };
  }
  return { ...numbers, status };
}
