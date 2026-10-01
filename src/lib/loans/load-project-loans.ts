import { db } from '@/lib/db';
import {
  lenderFilesRelation,
  lenderNotesRelation,
  loanFilesRelation,
  loanNotesRelation,
} from '@/lib/prisma/notes-files-relations';

export function loadProjectLoans(projectId: string) {
  return db.loan.findMany({
    where: {
      lender: {
        projectId,
      },
    },
    orderBy: {
      signDate: 'desc',
    },
    include: {
      lender: {
        include: {
          project: {
            include: {
              configuration: { select: { interestMethod: true } },
            },
          },
          user: {
            select: {
              name: true,
              id: true,
              email: true,
              lastLogin: true,
              lastInvited: true,
            },
          },
          notes: lenderNotesRelation,
          files: lenderFilesRelation,
        },
      },
      transactions: true,
      notes: loanNotesRelation,
      files: loanFilesRelation,
    },
  });
}
