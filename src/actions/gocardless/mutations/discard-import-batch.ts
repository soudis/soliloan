'use server';

import { db } from '@/lib/db';
import { projectIdSchema } from '@/lib/schemas/common';
import { projectAction } from '@/lib/utils/safe-action';

/** Deletes the project's draft import batch and records staged rows as dismissed so they are not re-fetched. */
export const discardImportBatchAction = projectAction
  .inputSchema(projectIdSchema)
  .action(async ({ parsedInput: { projectId } }) => {
    const batch = await db.bankImportBatch.findUnique({
      where: { projectId },
      include: { rows: { select: { bankTransactionId: true } } },
    });

    if (!batch) {
      return { discarded: false };
    }

    if (batch.rows.length > 0) {
      await db.importedBankTransaction.createMany({
        data: batch.rows.map((row) => ({
          connectionId: batch.connectionId,
          bankTransactionId: row.bankTransactionId,
          transactionId: null,
        })),
        skipDuplicates: true,
      });
    }

    await db.bankImportBatch.delete({ where: { id: batch.id } });

    return { discarded: true };
  });
