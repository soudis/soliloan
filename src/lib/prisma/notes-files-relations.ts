import type { Prisma } from '@prisma/client';

export const fileListSelect = {
  id: true,
  name: true,
  description: true,
  public: true,
  mimeType: true,
  lenderId: true,
  loanId: true,
  thumbnail: true,
  createdAt: true,
  createdById: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.FileSelect;

const noteCreatedByInclude = {
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.NoteInclude;

export const lenderNotesRelation = {
  orderBy: { createdAt: 'desc' },
  include: noteCreatedByInclude,
} satisfies Prisma.Lender$notesArgs;

export const lenderFilesRelation = {
  orderBy: { createdAt: 'desc' },
  select: fileListSelect,
} satisfies Prisma.Lender$filesArgs;

export const loanNotesRelation = {
  orderBy: { createdAt: 'desc' },
  include: noteCreatedByInclude,
} satisfies Prisma.Loan$notesArgs;

export const loanFilesRelation = {
  orderBy: { createdAt: 'desc' },
  select: fileListSelect,
} satisfies Prisma.Loan$filesArgs;
