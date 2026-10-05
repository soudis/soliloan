import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AdditionalFieldType, type AdditionalFieldConfig } from '@/lib/schemas/common';
import type { ProjectWithConfiguration } from '@/types/projects';

import { buildLenderTableColumnFilters, buildLoanTableColumnFilters } from './filter-definitions';

const lenderField: AdditionalFieldConfig = {
  id: 'note',
  name: 'Note',
  type: AdditionalFieldType.TEXT,
  selectOptions: [],
  required: false,
};

const project = {
  configuration: {
    lenderAdditionalFields: [lenderField],
    loanAdditionalFields: [],
  },
} as ProjectWithConfiguration;

const t = (key: string) => key;

describe('lender additional field filters', () => {
  it('keeps the lender table key unprefixed', () => {
    const filters = buildLenderTableColumnFilters(project, t, t, t);
    assert.equal(filters['additionalFields.note']?.label, 'Note');
    assert.equal(filters['lender.additionalFields.note'], undefined);
  });

  it('prefixes loan-table keys once so they match the column id', () => {
    const filters = buildLoanTableColumnFilters(project, t, t, t);
    assert.equal(filters['lender.additionalFields.note']?.label, 'Note');
    assert.equal(filters['lender.lender.additionalFields.note'], undefined);
  });
});
