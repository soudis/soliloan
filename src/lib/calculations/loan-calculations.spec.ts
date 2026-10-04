import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { InterestMethod } from '@prisma/client';
import moment from 'moment';

import { getInterestDays } from './loan-calculations';

// Local calendar dates keep the day count independent of the process timezone.
const calendarDay = (date: string) => moment(date, 'YYYY-MM-DD', true);

// A date as Prisma returns it: midnight UTC, which is 01:00 or 02:00 in Berlin.
const storedDate = (date: string) => moment(new Date(date));

describe('getInterestDays with ACT methods', () => {
  // All ACT methods count days the same way. They differ only in the base.
  const method = InterestMethod.ACT_365_NOCOMPOUND;

  it('splits a period at the year boundary without losing a day', () => {
    const deposit = storedDate('2023-01-15');
    const end = storedDate('2024-03-10');
    assert.equal(
      getInterestDays(deposit, undefined, method) + getInterestDays(undefined, end, method),
      moment(end).startOf('day').diff(moment(deposit).startOf('day'), 'days'),
    );
  });

  it('counts calendar days when a period starts in summer time and ends in winter time', () => {
    assert.equal(
      getInterestDays(storedDate('2019-04-01'), storedDate('2019-11-15'), method),
      calendarDay('2019-11-15').diff(calendarDay('2019-04-01'), 'days'),
    );
  });
});

describe('getInterestDays with E30/360', () => {
  const method = InterestMethod.E30_360_NOCOMPOUND;

  it('counts a start on the 31st like a start on the 30th', () => {
    assert.equal(
      getInterestDays(calendarDay('2023-01-31'), calendarDay('2023-03-31'), method),
      getInterestDays(calendarDay('2023-01-30'), calendarDay('2023-03-31'), method),
    );
  });

  it('counts a start on the 31st like a start on the 30th when the period runs to the end of the year', () => {
    assert.equal(
      getInterestDays(calendarDay('2023-01-31'), undefined, method),
      getInterestDays(calendarDay('2023-01-30'), undefined, method),
    );
  });

  it('counts two months of 30 days from 31 January to 31 March', () => {
    assert.equal(
      getInterestDays(calendarDay('2023-01-31'), calendarDay('2023-03-31'), method),
      2 * 30,
      'E30/360 treats the 31st as the 30th at the start and at the end of the period',
    );
  });

  it('counts an end on the 31st like an end on the 30th within one month', () => {
    assert.equal(
      getInterestDays(calendarDay('2023-01-15'), calendarDay('2023-01-30'), method),
      30 - 15,
      'premise: from 15 to 30 January counts 15 days',
    );
    assert.equal(
      getInterestDays(calendarDay('2023-01-15'), calendarDay('2023-01-31'), method),
      getInterestDays(calendarDay('2023-01-15'), calendarDay('2023-01-30'), method),
    );
  });

  it('counts a start on 31 December like a start on 30 December when the period runs to the end of the year', () => {
    assert.equal(
      getInterestDays(calendarDay('2023-12-30'), undefined, method),
      1,
      'premise: from 30 December the only interest day is the night to 1 January',
    );
    assert.equal(
      getInterestDays(calendarDay('2023-12-31'), undefined, method),
      getInterestDays(calendarDay('2023-12-30'), undefined, method),
    );
  });
});
