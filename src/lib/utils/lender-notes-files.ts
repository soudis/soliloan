import type { LenderWithRelations } from '@/types/lenders';

import { createdAtDescSorter } from './sorters';

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
