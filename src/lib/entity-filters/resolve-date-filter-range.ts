import moment from 'moment';

import { parseEntityDateFilterValue } from '@/types/entity-date-filter';

function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

export function resolveEntityDateFilterBounds(
  filterValue: unknown,
  referenceDate: Date,
): { start: Date | null; end: Date | null } | null {
  if (filterValue == null || filterValue === '') {
    return null;
  }

  const parsed = parseEntityDateFilterValue(filterValue);

  if (parsed.mode === 'relative') {
    const end = moment(referenceDate).endOf('day');
    const start = moment(referenceDate).subtract(parsed.amount, parsed.unit).startOf('day');
    return { start: start.toDate(), end: end.toDate() };
  }

  if (!parsed.start && !parsed.end) {
    return null;
  }

  return {
    start: parsed.start ? new Date(parsed.start) : null,
    end: parsed.end ? endOfDay(new Date(parsed.end)) : null,
  };
}
