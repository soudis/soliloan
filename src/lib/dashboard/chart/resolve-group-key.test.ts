import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TerminationType } from '@prisma/client';

import type { CalendarSpan } from '@/lib/calendar-span';

import { CHART_TERMINATION_GROUP_KEY, resolveGroupKey } from './resolve-group-key';

const span = (years: number, months = years * 12): CalendarSpan => ({
  totalDays: years * 365,
  years,
  months,
  remainderDays: 0,
});

const durationT = (key: string, values?: Record<string, string>) => {
  const count = Number(values?.count ?? 0);
  if (key === 'duration.byTermination') return 'Durch Kündigung';
  if (key === 'duration.years') return count === 1 ? `${count} Jahr` : `${count} Jahre`;
  if (key === 'duration.months') return count === 1 ? `${count} Monat` : `${count} Monate`;
  if (key === 'duration.days') return count === 1 ? `${count} Tag` : `${count} Tage`;
  return key;
};

const formatters = {
  emptyLabel: 'Ohne Wert',
  locale: 'de',
  commonT: durationT,
  t: (key: string, values?: Record<string, string | number>) => {
    if (key === 'numericBucketUpTo') return `bis ${values?.max}`;
    if (key === 'numericBucketRange') return `${values?.min} – ${values?.max}`;
    if (key === 'numericBucketAbove') return `über ${values?.min}`;
    return key;
  },
};

const durationField = { type: 'duration' as const, label: 'Kreditlaufzeit' };

describe('resolveGroupKey duration grouping', () => {
  it('groups a five-year span into years', () => {
    const result = resolveGroupKey(
      span(5),
      {
        groupBy: { entity: 'loan', field: 'totalRuntime' },
        durationGrouping: 'years',
        topNCategories: 8,
        filters: [],
      },
      durationField,
      formatters,
    );
    assert.equal(result.label, '5 Jahre');
    assert.equal(result.key, 'duration:years:5');
  });

  it('groups the same span into months', () => {
    const result = resolveGroupKey(
      span(1, 18),
      {
        groupBy: { entity: 'loan', field: 'totalRuntime' },
        durationGrouping: 'months',
        topNCategories: 8,
        filters: [],
      },
      durationField,
      formatters,
    );
    assert.equal(result.label, '18 Monate');
  });

  it('applies year limits as ranges', () => {
    const config = {
      groupBy: { entity: 'loan' as const, field: 'totalRuntime' },
      durationGrouping: 'years' as const,
      numericBuckets: [5, 10],
      topNCategories: 8,
      filters: [],
    };

    assert.equal(resolveGroupKey(span(5), config, durationField, formatters).label, 'bis 5 Jahre');
    assert.equal(resolveGroupKey(span(6), config, durationField, formatters).label, '6 Jahre – 10 Jahre');
    assert.equal(resolveGroupKey(span(11), config, durationField, formatters).label, 'über 10 Jahre');
  });

  it('keeps a measured loan without days in the empty group', () => {
    const result = resolveGroupKey(
      { terminationType: TerminationType.ENDDATE, days: null },
      {
        groupBy: { entity: 'loan', field: 'totalRuntime' },
        durationGrouping: 'years',
        topNCategories: 8,
        filters: [],
      },
      durationField,
      formatters,
    );
    assert.equal(result.label, 'Ohne Wert');
  });

  it('groups notice-period loans as Durch Kündigung', () => {
    const result = resolveGroupKey(
      { terminationType: TerminationType.TERMINATION, days: null },
      {
        groupBy: { entity: 'loan', field: 'totalRuntime' },
        durationGrouping: 'years',
        topNCategories: 8,
        filters: [],
      },
      durationField,
      formatters,
    );
    assert.equal(result.key, CHART_TERMINATION_GROUP_KEY);
    assert.equal(result.label, 'Durch Kündigung');
  });

  it('groups a TotalRuntime day count into years', () => {
    const result = resolveGroupKey(
      { terminationType: TerminationType.ENDDATE, days: 1827, years: 5, months: 60, remainderDays: 0 },
      {
        groupBy: { entity: 'loan', field: 'totalRuntime' },
        durationGrouping: 'years',
        topNCategories: 8,
        filters: [],
      },
      durationField,
      formatters,
    );
    assert.equal(result.label, '5 Jahre');
    assert.equal(result.key, 'duration:years:5');
  });
});
