import type { LoanWithCalculations } from '@/types/loans';

export type YearlyInterestLenderView = {
  id: string;
  name: string;
  email: string | null;
  iban: string | null;
  bic: string | null;
  street: string | null;
  addon: string | null;
  zip: string | null;
  place: string | null;
  country: string | null;
};

/** Loan-table row for one year, limited to loans that still have unpaid interest. */
export type YearlyInterestLoanRow = LoanWithCalculations & {
  unpaidYearlyInterest: number;
};

export type YearlyInterestLoanView = {
  id: string;
  loanNumber: number;
  interestRate: number;
  unpaid: number;
  lender: YearlyInterestLenderView;
};
