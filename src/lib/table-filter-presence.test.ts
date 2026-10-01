import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cleanupFiltersForHiddenColumns, getPresentColumnFilterIds } from './table-filter-presence';

const filterConfig = {
  repayDate: { type: 'date' as const },
  status: { type: 'select' as const },
};

describe('hidden column filters', () => {
  it('keeps a filter chip when its column is hidden and clears quick search on that column', () => {
    const columnFilters = [
      { id: 'repayDate', value: { operator: 'olderThan', amount: 1, unit: 'days' } },
      { id: 'status', value: { operator: 'eq', value: 'ACTIVE' } },
    ];

    assert.deepEqual(
      cleanupFiltersForHiddenColumns({
        nextVisibility: { repayDate: false },
        quickSearchField: 'repayDate',
      }),
      { quickSearchField: '', globalFilter: '' },
    );

    assert.equal(
      cleanupFiltersForHiddenColumns({
        nextVisibility: { repayDate: false },
        quickSearchField: '',
      }),
      null,
    );

    assert.deepEqual(getPresentColumnFilterIds({ columnFilters, quickSearchField: '' }, filterConfig), [
      'repayDate',
      'status',
    ]);
  });
});
