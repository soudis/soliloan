import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { TerminationType } from '@prisma/client';

import type { CalendarSpan } from '@/lib/calendar-span';

import { matchesDurationFilter } from './filter-matchers';

const span = (years: number, months: number, totalDays = years * 365): CalendarSpan => ({
  totalDays,
  years,
  months,
  remainderDays: 0,
});

describe('matchesDurationFilter', () => {
  const termination = {
    terminationType: TerminationType.TERMINATION,
    days: null,
    years: null,
    months: null,
    remainderDays: null,
  };
  const fiveYears = {
    terminationType: TerminationType.ENDDATE,
    days: 1827,
    years: 5,
    months: 60,
    remainderDays: 0,
  };
  const unresolved = {
    terminationType: TerminationType.DURATION,
    days: null,
    years: null,
    months: null,
    remainderDays: null,
  };

  it('treats = 5 Jahre as the fifth year, including extra months', () => {
    assert.equal(matchesDurationFilter(span(5, 60), { operator: 'eq', amount: 5, unit: 'years' }), true);
    assert.equal(matchesDurationFilter(span(5, 65), { operator: 'eq', amount: 5, unit: 'years' }), true);
    assert.equal(matchesDurationFilter(span(4, 59), { operator: 'eq', amount: 5, unit: 'years' }), false);
    assert.equal(matchesDurationFilter(span(6, 72), { operator: 'eq', amount: 5, unit: 'years' }), false);
  });

  it('keeps ab and bis on opposite sides of the anniversary', () => {
    assert.equal(matchesDurationFilter(span(5, 65), { operator: 'gte', amount: 5, unit: 'years' }), true);
    assert.equal(matchesDurationFilter(span(5, 60), { operator: 'gte', amount: 5, unit: 'years' }), true);
    assert.equal(matchesDurationFilter(span(4, 50), { operator: 'gte', amount: 5, unit: 'years' }), false);
    assert.equal(matchesDurationFilter(span(4, 50), { operator: 'lt', amount: 5, unit: 'years' }), true);
    assert.equal(matchesDurationFilter(span(5, 60), { operator: 'lt', amount: 5, unit: 'years' }), false);
    assert.equal(matchesDurationFilter(span(5, 65), { operator: 'lt', amount: 5, unit: 'years' }), false);
  });

  it('reads a stored > or ≤ as the next ab or bis', () => {
    assert.equal(matchesDurationFilter(span(5, 65), { operator: 'gt', amount: 5, unit: 'years' }), false);
    assert.equal(matchesDurationFilter(span(6, 72), { operator: 'gt', amount: 5, unit: 'years' }), true);
    assert.equal(matchesDurationFilter(span(5, 65), { operator: 'lte', amount: 5, unit: 'years' }), true);
    assert.equal(matchesDurationFilter(span(6, 72), { operator: 'lte', amount: 5, unit: 'years' }), false);
  });

  it('compares months as completed months and days as the day count', () => {
    assert.equal(matchesDurationFilter(span(1, 18, 547), { operator: 'eq', amount: 18, unit: 'months' }), true);
    assert.equal(matchesDurationFilter(span(1, 18, 547), { operator: 'lt', amount: 19, unit: 'months' }), true);
    assert.equal(matchesDurationFilter(span(1, 19, 580), { operator: 'gte', amount: 19, unit: 'months' }), true);
    assert.equal(matchesDurationFilter(span(0, 0, 10), { operator: 'eq', amount: 10, unit: 'days' }), true);
    assert.equal(matchesDurationFilter(span(0, 0, 11), { operator: 'gt', amount: 10, unit: 'days' }), true);
  });

  it('treats zwischen as inclusive completed-year bands', () => {
    assert.equal(matchesDurationFilter(span(5, 60), { operator: 'between', min: 5, max: 7, unit: 'years' }), true);
    assert.equal(matchesDurationFilter(span(7, 84), { operator: 'between', min: 5, max: 7, unit: 'years' }), true);
    assert.equal(matchesDurationFilter(span(8, 96), { operator: 'between', min: 5, max: 7, unit: 'years' }), false);
  });

  it('reads a legacy number payload as days', () => {
    assert.equal(matchesDurationFilter(1000, { operator: 'gte', value: 1000 }), true);
    assert.equal(matchesDurationFilter(999, { operator: 'gte', value: 1000 }), false);
    assert.equal(matchesDurationFilter(1500, { operator: 'between', min: 1000, max: 2000 }), true);
    assert.equal(matchesDurationFilter(fiveYears, { operator: 'gte', value: 1000 }), true);
    assert.equal(matchesDurationFilter(termination, { operator: 'gte', value: 1000 }), false);
  });

  it('does not invent years from a bare day count', () => {
    assert.equal(matchesDurationFilter(1827, { operator: 'eq', amount: 5, unit: 'years' }), false);
    assert.equal(matchesDurationFilter(1827, { operator: 'gt', amount: 5, unit: 'years' }), false);
  });

  it('treats null as empty only', () => {
    assert.equal(matchesDurationFilter(null, { operator: 'empty' }), true);
    assert.equal(matchesDurationFilter(null, { operator: 'gt', amount: 3, unit: 'years' }), false);
    assert.equal(matchesDurationFilter(null, { operator: 'notEmpty' }), false);
  });

  it('matches the termination operator only for notice-period loans', () => {
    assert.equal(matchesDurationFilter(termination, { operator: 'termination' }), true);
    assert.equal(matchesDurationFilter(fiveYears, { operator: 'termination' }), false);
    assert.equal(matchesDurationFilter(unresolved, { operator: 'termination' }), false);
    assert.equal(matchesDurationFilter(null, { operator: 'termination' }), false);
  });

  it('treats empty as unresolved measured runtime only', () => {
    assert.equal(matchesDurationFilter(unresolved, { operator: 'empty' }), true);
    assert.equal(matchesDurationFilter(termination, { operator: 'empty' }), false);
    assert.equal(matchesDurationFilter(fiveYears, { operator: 'empty' }), false);
  });

  it('treats notEmpty as a day count or notice period', () => {
    assert.equal(matchesDurationFilter(fiveYears, { operator: 'notEmpty' }), true);
    assert.equal(matchesDurationFilter(termination, { operator: 'notEmpty' }), true);
    assert.equal(matchesDurationFilter(unresolved, { operator: 'notEmpty' }), false);
  });

  it('matches length operators only against finite days on TotalRuntime', () => {
    assert.equal(matchesDurationFilter(fiveYears, { operator: 'gte', amount: 1000, unit: 'days' }), true);
    assert.equal(matchesDurationFilter(fiveYears, { operator: 'lt', amount: 1000, unit: 'days' }), false);
    assert.equal(matchesDurationFilter(termination, { operator: 'gte', amount: 1000, unit: 'days' }), false);
    assert.equal(matchesDurationFilter(unresolved, { operator: 'between', min: 0, max: 5000, unit: 'days' }), false);
  });

  it('matches a five-year Kreditlaufzeit with entspricht and ab, not with bis', () => {
    assert.equal(matchesDurationFilter(fiveYears, { operator: 'eq', amount: 5, unit: 'years' }), true);
    assert.equal(matchesDurationFilter(fiveYears, { operator: 'gte', amount: 5, unit: 'years' }), true);
    assert.equal(matchesDurationFilter(fiveYears, { operator: 'lt', amount: 5, unit: 'years' }), false);
    assert.equal(matchesDurationFilter(fiveYears, { operator: 'gt', amount: 5, unit: 'years' }), false);
  });
});
