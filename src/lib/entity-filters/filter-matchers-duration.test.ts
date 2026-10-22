import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TerminationType } from '@prisma/client';

import { matchesDurationFilter } from './filter-matchers';

describe('matchesDurationFilter', () => {
  const termination = { terminationType: TerminationType.TERMINATION, days: null };
  const measured = { terminationType: TerminationType.ENDDATE, days: 1826 };
  const unresolved = { terminationType: TerminationType.DURATION, days: null };

  it('compares years with the 365-day constant', () => {
    assert.equal(matchesDurationFilter(1096, { operator: 'gt', amount: 3, unit: 'years' }), true);
    assert.equal(matchesDurationFilter(1095, { operator: 'gt', amount: 3, unit: 'years' }), false);
    assert.equal(matchesDurationFilter(1095, { operator: 'gte', amount: 3, unit: 'years' }), true);
  });

  it('compares months with the 30-day constant', () => {
    assert.equal(matchesDurationFilter(91, { operator: 'gt', amount: 3, unit: 'months' }), true);
    assert.equal(matchesDurationFilter(90, { operator: 'gt', amount: 3, unit: 'months' }), false);
  });

  it('reads a legacy number payload as days', () => {
    assert.equal(matchesDurationFilter(1000, { operator: 'gte', value: 1000 }), true);
    assert.equal(matchesDurationFilter(999, { operator: 'gte', value: 1000 }), false);
    assert.equal(matchesDurationFilter(1500, { operator: 'between', min: 1000, max: 2000 }), true);
  });

  it('treats null as empty only', () => {
    assert.equal(matchesDurationFilter(null, { operator: 'empty' }), true);
    assert.equal(matchesDurationFilter(null, { operator: 'gt', amount: 3, unit: 'years' }), false);
    assert.equal(matchesDurationFilter(null, { operator: 'notEmpty' }), false);
  });

  it('matches the termination operator only for notice-period loans', () => {
    assert.equal(matchesDurationFilter(termination, { operator: 'termination' }), true);
    assert.equal(matchesDurationFilter(measured, { operator: 'termination' }), false);
    assert.equal(matchesDurationFilter(unresolved, { operator: 'termination' }), false);
    assert.equal(matchesDurationFilter(null, { operator: 'termination' }), false);
  });

  it('treats empty as unresolved measured runtime only', () => {
    assert.equal(matchesDurationFilter(unresolved, { operator: 'empty' }), true);
    assert.equal(matchesDurationFilter(termination, { operator: 'empty' }), false);
    assert.equal(matchesDurationFilter(measured, { operator: 'empty' }), false);
  });

  it('treats notEmpty as a day count or notice period', () => {
    assert.equal(matchesDurationFilter(measured, { operator: 'notEmpty' }), true);
    assert.equal(matchesDurationFilter(termination, { operator: 'notEmpty' }), true);
    assert.equal(matchesDurationFilter(unresolved, { operator: 'notEmpty' }), false);
  });

  it('matches length operators only against finite days on TotalRuntime', () => {
    assert.equal(matchesDurationFilter(measured, { operator: 'gte', amount: 1000, unit: 'days' }), true);
    assert.equal(matchesDurationFilter(measured, { operator: 'lt', amount: 1000, unit: 'days' }), false);
    assert.equal(matchesDurationFilter(termination, { operator: 'gte', amount: 1000, unit: 'days' }), false);
    assert.equal(
      matchesDurationFilter(unresolved, { operator: 'between', min: 0, max: 5000, unit: 'days' }),
      false,
    );
  });

  it('matches TotalRuntime against year units', () => {
    // 1826 days is just over 5×365, so gt 5 years matches and gt 6 years does not.
    assert.equal(matchesDurationFilter(measured, { operator: 'gt', amount: 3, unit: 'years' }), true);
    assert.equal(matchesDurationFilter(measured, { operator: 'gt', amount: 5, unit: 'years' }), true);
    assert.equal(matchesDurationFilter(measured, { operator: 'gt', amount: 6, unit: 'years' }), false);
  });
});
