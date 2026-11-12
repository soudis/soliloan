import 'server-only';

import { Entity, Operation } from '@prisma/client';

import { db } from '@/lib/db';

export type ImportDeletionPreview = {
  fileName: string;
  /** Records the Import created that still exist. */
  created: { lenders: number; loans: number; transactions: number; notes: number };
  /** Records added to the imported Kreditgeber*innen after the Import; deleting the Import deletes them too. */
  later: { loans: number; transactions: number; notes: number; files: number };
  /** Zahlungen on imported Kredite that Kreditgeber*innen were notified about. */
  notifiedTransactions: number;
  /** User accounts the Import created that have been used to sign in; they are kept. */
  usedAccounts: number;
};

async function findActiveImport(projectId: string, importId: string) {
  const found = await db.import.findFirst({
    where: { id: importId, projectId },
    select: { id: true, fileName: true, deletedAt: true, createdUserIds: true },
  });
  if (!found) throw new Error('error.import.notFound');
  if (found.deletedAt) throw new Error('error.import.alreadyDeleted');
  return found;
}

/** Counts what deleting an Import removes. The caller must have checked that the user manages the project. */
export async function getImportDeletionPreviewUnsafe(
  projectId: string,
  importId: string,
): Promise<ImportDeletionPreview> {
  const found = await findActiveImport(projectId, importId);
  const ofImportedLenders = { lender: { importId } };
  const [lenders, loans, transactions, notes, laterLoans, laterTransactions, laterNotes, files, notified, used] =
    await Promise.all([
      db.lender.count({ where: { importId } }),
      db.loan.count({ where: { importId } }),
      db.transaction.count({ where: { importId } }),
      db.note.count({ where: { importId } }),
      db.loan.count({ where: { ...ofImportedLenders, importId: null } }),
      db.transaction.count({ where: { loan: ofImportedLenders, importId: null } }),
      db.note.count({ where: { ...ofImportedLenders, importId: null } }),
      db.file.count({ where: ofImportedLenders }),
      db.transaction.count({ where: { loan: ofImportedLenders, lenderNotifiedAt: { not: null } } }),
      db.user.count({ where: { id: { in: found.createdUserIds }, lastLogin: { not: null } } }),
    ]);
  return {
    fileName: found.fileName,
    created: { lenders, loans, transactions, notes },
    later: { loans: laterLoans, transactions: laterTransactions, notes: laterNotes, files },
    notifiedTransactions: notified,
    usedAccounts: used,
  };
}

/**
 * Deletes everything an Import created, including data added to its Kreditgeber*innen later, and marks the Import
 * as deleted (ADR 0006). User accounts it created are deleted only when nothing uses them. The caller must have
 * checked that the user manages the project.
 */
export async function deleteImportUnsafe(projectId: string, importId: string, user: { id: string; name: string }) {
  const found = await findActiveImport(projectId, importId);

  await db.$transaction(
    async (tx) => {
      const lenderIds = (await tx.lender.findMany({ where: { importId }, select: { id: true } })).map(
        (lender) => lender.id,
      );
      // Notes and files do not cascade from their Kreditgeber*in or Kredit.
      const attached = { OR: [{ lenderId: { in: lenderIds } }, { loan: { lenderId: { in: lenderIds } } }] };
      await tx.note.deleteMany({ where: attached });
      await tx.file.deleteMany({ where: attached });
      // Kredite and Zahlungen cascade from the Kreditgeber*in.
      await tx.lender.deleteMany({ where: { id: { in: lenderIds } } });

      const now = new Date();
      await tx.import.update({ where: { id: importId }, data: { deletedAt: now, deletedById: user.id } });
      await tx.change.create({
        data: {
          entity: Entity.import,
          operation: Operation.DELETE,
          primaryKey: importId,
          projectId,
          before: { fileName: found.fileName, lenders: lenderIds.length },
          after: {},
          context: { user, import: { id: importId, fileName: found.fileName } },
          committedAt: now,
        },
      });
    },
    { timeout: 300_000, maxWait: 10_000 },
  );

  // Best effort, outside the transaction: an account someone started using stays.
  for (const userId of found.createdUserIds) {
    try {
      await db.user.deleteMany({
        where: {
          id: userId,
          lastLogin: null,
          // `not: true` would also skip NULL, which is what non-admins have.
          OR: [{ isAdmin: null }, { isAdmin: false }],
          lenders: { none: {} },
          managerOf: { none: {} },
          notes: { none: {} },
          files: { none: {} },
        },
      });
    } catch (error) {
      console.error('could not delete user account created by import', userId, error);
    }
  }
}
