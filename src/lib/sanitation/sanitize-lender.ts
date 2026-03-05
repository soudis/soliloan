import type { calculateLenderFields } from '../calculations/lender-calculations';
import { sanitizeLoanWithoutLender } from './sanitize-loan';

export function sanitizeLender(lender: ReturnType<typeof calculateLenderFields>) {
  const {
    loans: lenderLoans,
    notes: lenderNotes,
    files: lenderFiles,
    project: lenderProject,
    ...lenderOmitted
  } = lender;
  return {
    ...lenderOmitted,
    loans: lenderLoans?.map(sanitizeLoanWithoutLender),
  };
}
