import type { calculateLoanFields } from '../calculations/loan-calculations';

export function sanitizeLoan(loan: ReturnType<typeof calculateLoanFields>) {
  const { transactions: loanTransactions, notes: loanNotes, files: loanFiles, ...loanOmitted } = loan;
  const { notes: lenderNotes, files: lenderFiles, project: lenderProject, ...lenderOmitted } = loan.lender;
  return {
    ...loanOmitted,
    lender: lenderOmitted,
  };
}

export const sanitizeLoanWithoutLender = (loan: ReturnType<typeof calculateLoanFields>) => {
  const {
    transactions: loanTransactions,
    notes: loanNotes,
    files: loanFiles,
    lender: loanLender,
    ...loanOmitted
  } = loan;
  return loanOmitted;
};
