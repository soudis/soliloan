import moment from 'moment';

/** Completed calendar length between two dates. `months` counts whole months, not the remainder after years. */
export type CalendarSpan = {
  totalDays: number;
  years: number;
  months: number;
  remainderDays: number;
};

export function isCalendarSpan(value: unknown): value is CalendarSpan {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const span = value as Partial<CalendarSpan>;
  return (
    typeof span.totalDays === 'number' &&
    Number.isFinite(span.totalDays) &&
    typeof span.years === 'number' &&
    Number.isFinite(span.years) &&
    typeof span.months === 'number' &&
    Number.isFinite(span.months) &&
    typeof span.remainderDays === 'number' &&
    Number.isFinite(span.remainderDays)
  );
}

export function calendarSpanBetween(start: Date | string, end: Date | string): CalendarSpan | null {
  const startDay = moment(start).startOf('day');
  const endDay = moment(end).startOf('day');
  if (!startDay.isValid() || !endDay.isValid() || endDay.isBefore(startDay)) {
    return null;
  }

  const years = endDay.diff(startDay, 'years');
  const afterYears = startDay.clone().add(years, 'years');
  const remainderMonths = endDay.diff(afterYears, 'months');
  const remainderDays = endDay.diff(afterYears.clone().add(remainderMonths, 'months'), 'days');

  return {
    totalDays: endDay.diff(startDay, 'days'),
    years,
    months: years * 12 + remainderMonths,
    remainderDays,
  };
}

export function formatCalendarSpan(
  span: CalendarSpan,
  t: (key: string, values?: Record<string, number>) => string,
): string {
  const remainderMonths = span.months - span.years * 12;
  if (span.years === 0 && remainderMonths === 0 && span.remainderDays === 0) {
    return t('zeroDays');
  }

  const parts: string[] = [];
  if (span.years > 0) {
    parts.push(t('years', { count: span.years }));
  }
  if (remainderMonths > 0) {
    parts.push(t('months', { count: remainderMonths }));
  }
  if (span.remainderDays > 0) {
    parts.push(t('days', { count: span.remainderDays }));
  }

  return parts.length > 0 ? parts.join(' ') : t('zeroDays');
}
