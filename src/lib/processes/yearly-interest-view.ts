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

export type YearlyInterestLoanView = {
  id: string;
  loanNumber: number;
  interestRate: number;
  unpaid: number;
  lender: YearlyInterestLenderView;
};
