import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sortAggregationTableRows } from './compute-aggregation-table';

const row = (key: string, label: string) => ({ key, label, values: {} });

describe('sortAggregationTableRows duration limits', () => {
  const rows = [
    row('duration:years:bucket:2', 'über 10 Jahre'),
    row('__empty__', 'Ohne Wert'),
    row('duration:years:bucket:0', 'bis 5 Jahre'),
    row('duration:years:bucket:1', '6 Jahre – 10 Jahre'),
  ];

  it('orders groups by the limit, with empty last', () => {
    const sorted = sortAggregationTableRows(rows, '__group__', 'asc', 'de');
    assert.deepEqual(
      sorted.map((entry) => entry.label),
      ['bis 5 Jahre', '6 Jahre – 10 Jahre', 'über 10 Jahre', 'Ohne Wert'],
    );
  });

  it('reverses the limits and still keeps empty last', () => {
    const sorted = sortAggregationTableRows(rows, '__group__', 'desc', 'de');
    assert.deepEqual(
      sorted.map((entry) => entry.label),
      ['über 10 Jahre', '6 Jahre – 10 Jahre', 'bis 5 Jahre', 'Ohne Wert'],
    );
  });
});
