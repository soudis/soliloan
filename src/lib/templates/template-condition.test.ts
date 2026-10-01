import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { encodeConditionPayload, matchesTemplateCondition, type TemplateCondition } from './template-condition';
import { processTemplate } from './template-processor';

function rule(field: string, type: TemplateCondition[number]['type'], value: unknown): TemplateCondition {
  return [{ id: 'rule', field, type, value }];
}

describe('matchesTemplateCondition', () => {
  const scope = {
    loan: { amount: 1500, status: 'ACTIVE', signDate: new Date('2024-06-01T00:00:00.000Z'), isTerminated: false },
    lender: { firstName: 'Ada' },
  };

  it('treats an empty condition as true', () => {
    assert.equal(matchesTemplateCondition([], scope), true);
    assert.equal(matchesTemplateCondition(undefined, scope), true);
  });

  it('requires every rule to match', () => {
    const condition: TemplateCondition = [
      { id: 'a', field: 'loan.amount', type: 'number', value: { operator: 'gt', value: 1000 } },
      { id: 'b', field: 'loan.status', type: 'select', value: { operator: 'eq', value: 'ACTIVE' } },
    ];
    assert.equal(matchesTemplateCondition(condition, scope), true);
    condition[1].value = { operator: 'eq', value: 'REPAID' };
    assert.equal(matchesTemplateCondition(condition, scope), false);
  });

  it('compares numbers, dates, enums, and booleans', () => {
    assert.equal(matchesTemplateCondition(rule('loan.amount', 'number', { operator: 'gt', value: 1000 }), scope), true);
    assert.equal(
      matchesTemplateCondition(rule('loan.amount', 'number', { operator: 'gt', value: 2000 }), scope),
      false,
    );
    assert.equal(
      matchesTemplateCondition(
        rule('loan.signDate', 'date', { operator: 'between', start: '2024-01-01', end: '2024-12-31' }),
        scope,
      ),
      true,
    );
    assert.equal(
      matchesTemplateCondition(rule('loan.status', 'select', { operator: 'eq', value: 'ACTIVE' }), scope),
      true,
    );
    assert.equal(matchesTemplateCondition(rule('loan.isTerminated', 'boolean', 'false'), scope), true);
  });

  it('fails a rule when the field is missing', () => {
    assert.equal(matchesTemplateCondition(rule('loan.missing', 'number', { operator: 'gt', value: 1 }), scope), false);
  });
});

describe('processTemplate conditions', () => {
  it('keeps the then branch or the else branch', () => {
    const payload = encodeConditionPayload(rule('loan.amount', 'number', { operator: 'gt', value: 1000 }));
    const template = `{{#if:${payload}}}yes{{else}}no{{/if}}`;
    assert.equal(processTemplate(template, { __raw: { loan: { amount: 1500 } } }), 'yes');
    assert.equal(processTemplate(template, { __raw: { loan: { amount: 10 } } }), 'no');
  });

  it('nests ifs and evaluates an if inside a loop item', () => {
    const outer = encodeConditionPayload(rule('lender.firstName', 'text', { operator: 'eq', value: 'Ada' }));
    const inner = encodeConditionPayload(rule('loan.amount', 'number', { operator: 'gt', value: 100 }));
    const nested = `{{#if:${outer}}}{{#if:${inner}}}in{{else}}out{{/if}}{{else}}skip{{/if}}`;
    assert.equal(processTemplate(nested, { __raw: { lender: { firstName: 'Ada' }, loan: { amount: 1500 } } }), 'in');

    const loop = `{{#loans}}{{#if:${inner}}}{{loan.name}}{{else}}-{{/if}}{{/loans}}`;
    const rendered = processTemplate(loop, {
      loans: [{ loan: { name: 'A' } }, { loan: { name: 'B' } }],
      __raw: {
        loans: [{ loan: { amount: 50 } }, { loan: { amount: 500 } }],
      },
    });
    assert.equal(rendered, '-B');
  });

  it('shows the else branch when the field is missing', () => {
    const payload = encodeConditionPayload(rule('loan.amount', 'number', { operator: 'gt', value: 1 }));
    assert.equal(processTemplate(`{{#if:${payload}}}yes{{else}}no{{/if}}`, { __raw: {} }), 'no');
  });
});
