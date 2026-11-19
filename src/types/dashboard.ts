/** Snapshot of calculated loan numbers for a single calendar month (1–12). */
export type LoanMonthlyNumbers = {
  begin: number;
  end: number;
  withdrawals: number;
  deposits: number;
  notReclaimed: number;
  interestPaid: number;
  interest: number;
  /** Zinsübertrag booked by an Import (ADR 0010): raises `end` without being interest of the month. */
  interestCarryover: number;
  interestError: number;
  /** Interest-bearing amount after this month's transactions. A stock, like `end`. */
  interestBaseAmount: number;
};

/** Per-loan history keyed by year, then month. */
export type LoanMonthlyHistory = Record<number, Record<number, LoanMonthlyNumbers>>;
