import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { TemplateConditionField } from './template-condition-fields';
import { type ConditionSummaryLabels, formatTemplateConditionSummary } from './template-condition-summary';

const labels: ConditionSummaryLabels = {
  join: 'und',
  yes: 'Ja',
  no: 'Nein',
  operators: {
    number: {
      between: 'zwischen',
      eq: '=',
      gt: '>',
      lt: '<',
      gte: '≥',
      lte: '≤',
      empty: 'ist leer',
      notEmpty: 'ist nicht leer',
    },
    text: {
      contains: 'enthält',
      startsWith: 'beginnt mit',
      endsWith: 'endet mit',
      eq: '=',
      empty: 'ist leer',
      notEmpty: 'ist nicht leer',
    },
    enum: { eq: 'ist', in: 'eines von', empty: 'ist leer', notEmpty: 'ist nicht leer' },
    date: {
      between: 'zwischen',
      olderThan: 'älter als',
      newerThan: 'neuer als',
      thisMonth: 'diesen Monat',
      lastMonth: 'letzten Monat',
      thisYear: 'dieses Jahr',
      lastYear: 'letztes Jahr',
      last: 'letzte…',
      next: 'nächste…',
      year: 'Jahr',
      empty: 'ist leer',
      notEmpty: 'ist nicht leer',
    },
  },
  between: (start, end) => `zwischen ${start} und ${end}`,
  from: (value) => `ab ${value}`,
  until: (value) => `bis ${value}`,
  duration: (count, unit) => (unit === 'days' ? `${count} Tage` : `${count} Monate`),
  relative: {
    last: (span) => `letzte ${span}`,
    next: (span) => `nächste ${span}`,
    olderThan: (span) => `älter als ${span}`,
    newerThan: (span) => `neuer als ${span}`,
  },
};

const fields: TemplateConditionField[] = [
  { field: 'loan.loanNumber', label: 'Kontonummer', group: 'loan', type: 'number' },
  {
    field: 'loan.status',
    label: 'Status',
    group: 'loan',
    type: 'select',
    options: [
      { label: 'Aktiv', value: 'ACTIVE' },
      { label: 'Getilgt', value: 'REPAID' },
    ],
  },
];

describe('formatTemplateConditionSummary', () => {
  it('describes one comparison', () => {
    const summary = formatTemplateConditionSummary(
      [{ id: 'a', field: 'loan.loanNumber', type: 'number', value: { operator: 'gt', value: 100 } }],
      fields,
      labels,
    );
    assert.equal(summary, 'Kontonummer > 100');
  });

  it('joins every rule with und', () => {
    const summary = formatTemplateConditionSummary(
      [
        { id: 'a', field: 'loan.loanNumber', type: 'number', value: { operator: 'gt', value: 100 } },
        { id: 'b', field: 'loan.status', type: 'select', value: { operator: 'eq', value: 'ACTIVE' } },
      ],
      fields,
      labels,
    );
    assert.equal(summary, 'Kontonummer > 100 und Status ist Aktiv');
  });

  it('uses the option label and skips a rule that has no value yet', () => {
    const summary = formatTemplateConditionSummary(
      [{ id: 'a', field: 'loan.status', type: 'select', value: { operator: 'eq', value: '' } }],
      fields,
      labels,
    );
    assert.equal(summary, 'Status');
  });
});
