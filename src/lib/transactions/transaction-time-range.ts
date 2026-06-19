import {
  endOfDay,
  endOfMonth,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from 'date-fns';

export const TRANSACTION_TIME_RANGE_PRESETS = [
  'last_30_days',
  'last_6_months',
  'last_12_months',
  'this_month',
  'last_month',
  'this_year',
  'last_year',
  'all',
  'custom',
] as const;

export type TransactionTimeRangePreset = (typeof TRANSACTION_TIME_RANGE_PRESETS)[number];

export const DEFAULT_TRANSACTION_TIME_RANGE: TransactionTimeRangePreset = 'last_30_days';

export function formatTransactionDateParam(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getDefaultTransactionCustomFrom(): string {
  return formatTransactionDateParam(subDays(new Date(), 30));
}

export function getDefaultTransactionCustomTo(): string {
  return formatTransactionDateParam(new Date());
}

export type TransactionTimeRangeBounds = {
  start: Date;
  end: Date;
};

export function resolveTimeRangeBounds(
  txRange: TransactionTimeRangePreset,
  txRangeFrom?: string | null,
  txRangeTo?: string | null,
  referenceDate: Date = new Date(),
): TransactionTimeRangeBounds {
  const now = referenceDate;

  if (txRange === 'custom') {
    const fromRaw = txRangeFrom || getDefaultTransactionCustomFrom();
    const toRaw = txRangeTo || getDefaultTransactionCustomTo();
    const start = startOfDay(new Date(fromRaw));
    const end = endOfDay(new Date(toRaw));
    if (start.getTime() <= end.getTime()) {
      return { start, end };
    }
    return {
      start: startOfDay(subDays(now, 30)),
      end: endOfDay(now),
    };
  }

  switch (txRange) {
    case 'last_6_months':
      return { start: startOfDay(subMonths(now, 6)), end: endOfDay(now) };
    case 'last_12_months':
      return { start: startOfDay(subMonths(now, 12)), end: endOfDay(now) };
    case 'this_month':
      return { start: startOfMonth(now), end: endOfDay(now) };
    case 'last_month': {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    case 'this_year':
      return { start: startOfYear(now), end: endOfDay(now) };
    case 'last_year': {
      const lastYear = subYears(now, 1);
      return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
    }
    case 'all':
      return { start: new Date(0), end: endOfDay(now) };
    case 'last_30_days':
    default:
      return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
  }
}

export function isTransactionInTimeRange(date: Date, bounds: TransactionTimeRangeBounds): boolean {
  const time = date.getTime();
  return time >= bounds.start.getTime() && time <= bounds.end.getTime();
}
