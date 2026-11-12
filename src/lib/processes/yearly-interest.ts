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
 * What a yearly payout settles for one year entry: the year's interest plus a Zinsübertrag booked in that year, minus
 * the Zinsauszahlungen of the year (stored negative). The Zinsübertrag is never interest of a year in statements, but
 * interest carried over from an old system is still owed and is paid out with its Stichtag year (ADR 0010).
 */
export function unpaidInterestOfYear(entry: {
  interest: Prisma.Decimal.Value;
  interestCarryover: Prisma.Decimal.Value;
  interestPaid: Prisma.Decimal.Value;
}): Prisma.Decimal {
  return new Prisma.Decimal(entry.interest).plus(entry.interestCarryover).plus(entry.interestPaid).toDecimalPlaces(2);
}

/**
 * Unpaid interest for one calendar year, in euros, rounded to cents.
 * `interestPaid` is the sum of INTERESTPAYMENT amounts, which are stored negative.
 */
export function unpaidYearlyInterest(loan: LoanWithRelations, year: number): number {
  const perYear = calculateLoanPerYear(loan, payoutAsOfDate(year));
  const entry = perYear.find((row) => row.year === year);
  if (!entry) {
    return 0;
  }

  const unpaid = unpaidInterestOfYear(entry);
  return unpaid.greaterThan(0) ? unpaid.toNumber() : 0;
}

/** Kredite with yearly Zinsauszahlung whose interest of `year` is not fully paid out yet. */
export function countOpenYearlyInterest(loans: LoanWithRelations[], year: number): number {
  return loans.filter(
    (loan) => loan.interestPaymentType === InterestPaymentType.YEARLY && unpaidYearlyInterest(loan, year) > 0,
  ).length;
}
