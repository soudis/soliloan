import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveGroupKey } from './resolve-group-key';

const durationT = (key: string, values?: Record<string, string>) => {
  const count = Number(values?.count ?? 0);
  if (key === 'duration.years') return count === 1 ? `${count} Jahr` : `${count} Jahre`;
  if (key === 'duration.months') return count === 1 ? `${count} Monat` : `${count} Monate`;
  if (key === 'duration.days') return count === 1 ? `${count} Tag` : `${count} Tage`;
  return key;
};

const formatters = {
  emptyLabel: 'Ohne Wert',
  locale: 'de',
  commonT: durationT,
  t: (key: string) => key,
};

const durationField = { type: 'number' as const, label: 'Gesamtlaufzeit', valueKind: 'duration' as const };

describe('resolveGroupKey duration grouping', () => {
  it('groups a five-year span into years', () => {
    const result = resolveGroupKey(
      1826,
      {
        groupBy: { entity: 'loan', field: 'totalRuntimeDays' },
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
      547,
      {
        groupBy: { entity: 'loan', field: 'totalRuntimeDays' },
        durationGrouping: 'months',
        topNCategories: 8,
        filters: [],
      },
      durationField,
      formatters,
    );
    assert.equal(result.label, '18 Monate');
  });

  it('keeps notice-period loans without a value in the empty group', () => {
    const result = resolveGroupKey(
      null,
      {
        groupBy: { entity: 'loan', field: 'totalRuntimeDays' },
        durationGrouping: 'years',
        topNCategories: 8,
        filters: [],
      },
      durationField,
      formatters,
    );
    assert.equal(result.label, 'Ohne Wert');
  });
});
