import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseDurationFilterValue } from './duration-filter-value';

describe('parseDurationFilterValue', () => {
  it('starts a new filter on entspricht', () => {
    assert.deepEqual(parseDurationFilterValue(undefined), {
      operator: 'eq',
      amount: null,
      unit: 'years',
    });
  });

  it('rewrites a stored > 5 Jahre to ab 6 Jahre', () => {
    assert.deepEqual(parseDurationFilterValue({ operator: 'gt', amount: 5, unit: 'years' }), {
      operator: 'gte',
      amount: 6,
      unit: 'years',
    });
  });

  it('rewrites a stored ≤ 5 Jahre to bis 6 Jahre', () => {
    assert.deepEqual(parseDurationFilterValue({ operator: 'lte', amount: 5, unit: 'years' }), {
      operator: 'lt',
      amount: 6,
      unit: 'years',
    });
  });

  it('leaves entspricht, ab, and bis unchanged', () => {
    assert.deepEqual(parseDurationFilterValue({ operator: 'eq', amount: 5, unit: 'years' }), {
      operator: 'eq',
      amount: 5,
      unit: 'years',
    });
    assert.deepEqual(parseDurationFilterValue({ operator: 'gte', amount: 5, unit: 'months' }), {
      operator: 'gte',
      amount: 5,
      unit: 'months',
    });
    assert.deepEqual(parseDurationFilterValue({ operator: 'lt', amount: 10, unit: 'days' }), {
      operator: 'lt',
      amount: 10,
      unit: 'days',
    });
  });
});
