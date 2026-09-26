import { InterestPaymentType, Prisma } from '@prisma/client';
import moment from 'moment';

import { calculateLoanPerYear } from '@/lib/calculations/loan-calculations';
import type { LoanWithRelations } from '@/types/loans';

/** Noon on 2 January of the following year, so the payout year is a completed year in the interest engine. */
export function payoutAsOfDate(year: number): Date {
  return new Date(Date.UTC(year + 1, 0, 2, 12, 0, 0));
}

/** Booking date for a yearly interest payout: 31 December, stored as UTC midnight. */
export function payoutBookingDate(year: number): Date {
  return new Date(Date.UTC(year, 11, 31, 0, 0, 0));
}

export function transactionCalendarYear(date: Date): number {
  return moment(date).year();
}

/**
 * Unpaid interest for one calendar year, in euros, rounded to cents.
 * `interestPaid` is the sum of INTERESTPAYMENT amounts, which are stored negative.
 */
export function unpaidYearlyInterest(loan: LoanWithRelations, year: number): number {
  if (loan.interestPaymentType !== InterestPaymentType.YEARLY) {
    return 0;
  }

  const perYear = calculateLoanPerYear(loan, payoutAsOfDate(year));
  const entry = perYear.find((row) => row.year === year);
  if (!entry) {
    return 0;
  }

  const unpaid = new Prisma.Decimal(entry.interest).plus(entry.interestPaid).toDecimalPlaces(2);
  return unpaid.greaterThan(0) ? unpaid.toNumber() : 0;
}
