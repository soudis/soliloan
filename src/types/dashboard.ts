/** Snapshot of calculated loan numbers for a single calendar month (1–12). */
export type LoanMonthlyNumbers = {
  begin: number;
  end: number;
  withdrawals: number;
  deposits: number;
  notReclaimed: number;
  interestPaid: number;
  interest: number;
  interestError: number;
};

/** Per-loan history keyed by year, then month. */
export type LoanMonthlyHistory = Record<number, Record<number, LoanMonthlyNumbers>>;
