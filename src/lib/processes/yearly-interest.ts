import { InterestPaymentType, Prisma } from '@prisma/client';
import moment from 'moment';

import { calculateLoanPerYear, isRepaid } from '@/lib/calculations/loan-calculations';
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

/** Later than any booked Zahlung, so `isRepaid` finds a closing Zahlung whatever its date. */
const END_OF_TIME = new Date(8_640_000_000_000_000);

/**
 * Whether the Kredit's closing Zahlung (a Rückzahlung or Nicht rückgefordert as its last Zahlung) settled the
 * Zinsertrag of `year`. That Zahlung covers the whole Kontostand, so it takes along the Zinsertrag of its own year
 * and any earlier one not paid out yet. A Kündigung alone settles nothing.
 */
export function isInterestSettledByClosing(loan: LoanWithRelations, year: number): boolean {
  const closingDate = isRepaid(loan, END_OF_TIME);
  return closingDate !== undefined && year <= moment(closingDate).year();
}

/**
 * Unpaid interest for one calendar year, in euros, rounded to cents.
 * `interestPaid` is the sum of INTERESTPAYMENT amounts, which are stored negative.
 */
export function unpaidYearlyInterest(loan: LoanWithRelations, year: number): number {
  if (isInterestSettledByClosing(loan, year)) {
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

/** Kredite with yearly Zinsauszahlung whose interest of `year` is not fully paid out yet. */
export function countOpenYearlyInterest(loans: LoanWithRelations[], year: number): number {
  return loans.filter(
    (loan) => loan.interestPaymentType === InterestPaymentType.YEARLY && unpaidYearlyInterest(loan, year) > 0,
  ).length;
}
