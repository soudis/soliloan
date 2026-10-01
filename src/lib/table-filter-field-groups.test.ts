import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildFilterFieldMenuGroups } from './table-filter-field-groups';

describe('buildFilterFieldMenuGroups', () => {
  it('puts visible columns in Angezeigt and keeps hidden columns in their Spalten groups', () => {
    const groups = buildFilterFieldMenuGroups([
      { id: 'status', visible: true, groupKey: null, groupOrder: 0 },
      { id: 'repayDate', visible: false, groupKey: null, groupOrder: 0 },
      { id: 'amount', visible: false, groupKey: 'loan', groupOrder: 0 },
      { id: 'lender.name', visible: true, groupKey: 'lender', groupOrder: 1 },
      { id: 'lender.email', visible: false, groupKey: 'lender', groupOrder: 1 },
    ]);

    assert.deepEqual(groups, [
      { key: 'shown', columnIds: ['status', 'lender.name'] },
      { key: 'ungrouped', columnIds: ['repayDate'] },
      { key: 'loan', columnIds: ['amount'] },
      { key: 'lender', columnIds: ['lender.email'] },
    ]);
  });

  it('omits a group that has no columns left', () => {
    const groups = buildFilterFieldMenuGroups([
      { id: 'status', visible: true, groupKey: null, groupOrder: 0 },
      { id: 'lender.name', visible: true, groupKey: 'lender', groupOrder: 1 },
    ]);

    assert.deepEqual(groups, [{ key: 'shown', columnIds: ['status', 'lender.name'] }]);
  });
});
