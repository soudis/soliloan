import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CHART_TERMINATION_GROUP_KEY } from '@/lib/dashboard/chart/resolve-group-key';

import { sortAggregationTableRows } from './compute-aggregation-table';

const row = (key: string, label: string) => ({ key, label, values: {} });

describe('sortAggregationTableRows duration limits', () => {
  const rows = [
    row('duration:years:bucket:2', '10 Jahre und mehr'),
    row('__empty__', 'Ohne Wert'),
    row('duration:years:bucket:0', 'bis 5 Jahre'),
    row('duration:years:bucket:1', '5 Jahre – 10 Jahre'),
  ];

  it('orders groups by the limit, with empty last', () => {
    const sorted = sortAggregationTableRows(rows, '__group__', 'asc', 'de');
    assert.deepEqual(
      sorted.map((entry) => entry.label),
      ['bis 5 Jahre', '5 Jahre – 10 Jahre', '10 Jahre und mehr', 'Ohne Wert'],
    );
  });

  it('reverses the limits and still keeps empty last', () => {
    const sorted = sortAggregationTableRows(rows, '__group__', 'desc', 'de');
    assert.deepEqual(
      sorted.map((entry) => entry.label),
      ['10 Jahre und mehr', '5 Jahre – 10 Jahre', 'bis 5 Jahre', 'Ohne Wert'],
    );
  });

  it('puts notice-period loans first ascending and last among measured ranges descending', () => {
    const withTermination = [...rows, row(CHART_TERMINATION_GROUP_KEY, 'Durch Kündigung')];

    assert.deepEqual(
      sortAggregationTableRows(withTermination, '__group__', 'asc', 'de').map((entry) => entry.label),
      ['Durch Kündigung', 'bis 5 Jahre', '5 Jahre – 10 Jahre', '10 Jahre und mehr', 'Ohne Wert'],
    );
    assert.deepEqual(
      sortAggregationTableRows(withTermination, '__group__', 'desc', 'de').map((entry) => entry.label),
      ['10 Jahre und mehr', '5 Jahre – 10 Jahre', 'bis 5 Jahre', 'Durch Kündigung', 'Ohne Wert'],
    );
  });

  it('orders months, weeks, weekdays, and amounts by the key', () => {
    assert.deepEqual(
      sortAggregationTableRows(
        [row('month:2024-11', 'Nov 2024'), row('month:2024-03', 'Mär 2024'), row('month:2024-01', 'Jan 2024')],
        '__group__',
        'asc',
        'de',
      ).map((entry) => entry.label),
      ['Jan 2024', 'Mär 2024', 'Nov 2024'],
    );
    assert.deepEqual(
      sortAggregationTableRows(
        [row('week:2025-W10', 'KW 10'), row('week:2025-W5', 'KW 5'), row('week:2026-W1', 'KW 1')],
        '__group__',
        'asc',
        'de',
      ).map((entry) => entry.key),
      ['week:2025-W5', 'week:2025-W10', 'week:2026-W1'],
    );
    assert.deepEqual(
      sortAggregationTableRows(
        [row('dow:0', 'Sonntag'), row('dow:3', 'Mittwoch'), row('dow:1', 'Montag')],
        '__group__',
        'asc',
        'de',
      ).map((entry) => entry.label),
      ['Montag', 'Mittwoch', 'Sonntag'],
    );
    assert.deepEqual(
      sortAggregationTableRows(
        [row('num:1000', '1.000,00 €'), row('num:200', '200,00 €')],
        '__group__',
        'asc',
        'de',
      ).map((entry) => entry.label),
      ['200,00 €', '1.000,00 €'],
    );
  });
});
