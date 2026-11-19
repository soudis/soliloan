import type { InterestMethod } from '@prisma/client';
import moment, { type Moment } from 'moment';

/**
 * The Zinstage count taken over from habidat-direktkredit, errors included (#231). It only serves Zinsjahre
 * before a project's Umstellungsjahr, whose interest is already booked (ADR 0005). Do not fix it.
 */
export const getLegacyInterestDays = (
  fromDateParameter: Moment | undefined,
  toDateParameter: Moment | undefined,
  interestMethod: InterestMethod,
) => {
  const fromDate = fromDateParameter ? fromDateParameter : moment(toDateParameter).startOf('year');
  const toDate = toDateParameter ? toDateParameter : moment(fromDateParameter).endOf('year');
  const firstYear = !toDateParameter;
  const lastYear = !fromDateParameter;
  if (interestMethod.startsWith('E30_360')) {
    if (toDate.isSameOrBefore(moment(fromDate).endOf('month'))) {
      return moment(toDate).diff(fromDate, 'days');
    }
    let interestDays = Math.max(30 - fromDate.date() + 1, 0);
    const months = moment(toDate).month() - fromDate.month() - 1;
    interestDays += months * 30;
    interestDays += Math.min(moment(toDate).date(), 30);
    interestDays -= lastYear ? 1 : 0;
    interestDays -= !lastYear && !firstYear ? 1 : 0;
    return interestDays;
  }
  return toDate.diff(fromDate, 'days');
};
