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

/** List views only need aggregate fields — omit nested loans and merged notes/files (incl. thumbnails). */
export function sanitizeLenderForList(lender: ReturnType<typeof calculateLenderFields>) {
  const { allNotes, allFiles, loans, ...lenderForList } = sanitizeLender(lender);
  return lenderForList;
}
