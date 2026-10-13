import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { InterestMethod } from '@prisma/client';
import moment from 'moment';

import { getInterestDays } from './loan-calculations';

// Local calendar dates keep the day count independent of the process timezone.
const calendarDay = (date: string) => moment(date, 'YYYY-MM-DD', true);

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
});
