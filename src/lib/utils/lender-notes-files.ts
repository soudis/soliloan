import type { LenderWithRelations } from '@/types/lenders';

import { createdAtDescSorter } from './sorters';

/** Notes or files of a Kreditgeber*in that belong to no Kredit; Kredit items show under their Kredit. */
export function withoutLoan<T extends { loanId: string | null }>(items: T[]): T[] {
  return items.filter((item) => item.loanId === null);
}

export function mergeLenderNotes(lender: Pick<LenderWithRelations, 'notes' | 'loans'>): LenderWithRelations['notes'] {
  const loanNotes =
    lender.loans?.flatMap((loan) => loan.notes.filter((n) => !lender.notes.some((ln) => ln.id === n.id))) ?? [];
  return [...lender.notes, ...loanNotes].sort(createdAtDescSorter);
}

export function mergeLenderFiles(lender: Pick<LenderWithRelations, 'files' | 'loans'>): LenderWithRelations['files'] {
  const loanFiles =
    lender.loans?.flatMap((loan) => loan.files.filter((f) => !lender.files.some((lf) => lf.id === f.id))) ?? [];
  return [...lender.files, ...loanFiles].sort(createdAtDescSorter);
}
