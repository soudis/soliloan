import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { InterestMethod } from '@prisma/client';

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

const project: ProjectWithConfiguration = {
  id: 'project-1',
  slug: 'project-1',
  configurationId: 'config-1',
  hasHistoricTransactions: false,
  managers: [],
  templates: [],
  configuration: {
    id: 'config-1',
    name: 'Test',
    logo: null,
    email: null,
    telNo: null,
    website: null,
    street: null,
    addon: null,
    zip: null,
    place: null,
    country: null,
    iban: null,
    bic: null,
    userLanguage: null,
    lenderRequiredFields: [],
    lenderSalutation: null,
    lenderCountry: null,
    interestMethod: InterestMethod.ACT_360_COMPOUND,
    altInterestMethods: [],
    defaultLoanTemplateId: null,
    lenderAdditionalFields: [lenderField],
    loanAdditionalFields: [],
    loanTemplates: [],
    deInvestmentActCompliance: false,
  },
};

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
