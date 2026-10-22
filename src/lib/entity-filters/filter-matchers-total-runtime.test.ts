import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TerminationType } from '@prisma/client';

import { matchesDurationFilter } from './filter-matchers';

describe('matchesDurationFilter TotalRuntime', () => {
  const termination = { terminationType: TerminationType.TERMINATION, days: null };
  const measured = { terminationType: TerminationType.ENDDATE, days: 1826 };
  const unresolved = { terminationType: TerminationType.DURATION, days: null };

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

  it('matches range operators only against finite days', () => {
    assert.equal(matchesDurationFilter(measured, { operator: 'gte', amount: 1000, unit: 'days' }), true);
    assert.equal(matchesDurationFilter(measured, { operator: 'lt', amount: 1000, unit: 'days' }), false);
    assert.equal(matchesDurationFilter(termination, { operator: 'gte', amount: 1000, unit: 'days' }), false);
    assert.equal(
      matchesDurationFilter(unresolved, { operator: 'between', min: 0, max: 5000, unit: 'days' }),
      false,
    );
  });

  it('still understands a legacy day-count number payload', () => {
    assert.equal(matchesDurationFilter(measured, { operator: 'gte', value: 1000 }), true);
    assert.equal(matchesDurationFilter(termination, { operator: 'gte', value: 1000 }), false);
  });
});
