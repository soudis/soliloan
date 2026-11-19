import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calendarSpanBetween, formatCalendarSpan } from './calendar-span';

const t = (key: string, values?: Record<string, number>) => {
  const count = values?.count ?? 0;
  if (key === 'zeroDays') return '0 Tage';
  if (key === 'years') return count === 1 ? `${count} Jahr` : `${count} Jahre`;
  if (key === 'months') return count === 1 ? `${count} Monat` : `${count} Monate`;
  if (key === 'days') return count === 1 ? `${count} Tag` : `${count} Tage`;
  return key;
};

describe('calendarSpanBetween', () => {
  it('counts a five-year anniversary as five completed years', () => {
    const span = calendarSpanBetween(new Date(2020, 0, 15), new Date(2025, 0, 15));
    assert.equal(span?.years, 5);
    assert.equal(span?.months, 60);
    assert.equal(span?.remainderDays, 0);
    assert.ok((span?.totalDays ?? 0) > 5 * 365);
    assert.equal(span ? formatCalendarSpan(span, t) : '', '5 Jahre');
  });

  it('keeps the day before the anniversary in the previous year', () => {
    const span = calendarSpanBetween(new Date(2020, 0, 15), new Date(2025, 0, 14));
    assert.equal(span?.years, 4);
  });

  it('keeps extra months inside the completed year', () => {
    const span = calendarSpanBetween(new Date(2020, 0, 15), new Date(2025, 5, 15));
    assert.equal(span?.years, 5);
    assert.equal(span?.months, 65);
    assert.equal(span ? formatCalendarSpan(span, t) : '', '5 Jahre 5 Monate');
  });
});
