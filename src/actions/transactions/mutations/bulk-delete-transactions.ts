'use server';

import { Entity, Operation, TransactionType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  createAuditEntry,
  getLenderContext,
  getLoanContext,
  getTransactionContext,
  removeNullFields,
} from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { projectAction } from '@/lib/utils/safe-action';

const bulkDeleteTransactionsSchema = z.object({
  projectId: z.string(),
  transactionIds: z.array(z.string()).min(1),
});

export const bulkDeleteTransactionsAction = projectAction
  .schema(bulkDeleteTransactionsSchema)
  .action(async ({ parsedInput: { projectId, transactionIds } }) => {
    const transactions = await db.transaction.findMany({
      where: {
        id: { in: transactionIds },
        loan: { lender: { projectId } },
      },
      include: {
        loan: {
          include: {
            transactions: { orderBy: { date: 'asc' } },
            lender: {
              include: {
                project: { include: { configuration: true } },
              },
            },
          },
        },
      },
    });

    if (transactions.length === 0) {
      throw new Error('No transactions found');
    }

    let deletedCount = 0;
    const skippedIds: string[] = [];

    for (const transaction of transactions) {
      if (transaction.type === TransactionType.INTEREST) {
        skippedIds.push(transaction.id);
        continue;
      }

      const lastNonInterest = [...transaction.loan.transactions]
        .reverse()
        .find((tx) => tx.type !== TransactionType.INTEREST);

      if (lastNonInterest?.id !== transaction.id) {
        skippedIds.push(transaction.id);
        continue;
      }

      await createAuditEntry(db, {
        entity: Entity.transaction,
        operation: Operation.DELETE,
        primaryKey: transaction.id,
        before: removeNullFields(transaction),
        after: {},
        context: {
          ...getLenderContext(transaction.loan.lender),
          ...getLoanContext(transaction.loan),
          ...getTransactionContext(transaction),
        },
        projectId,
      });

      await db.transaction.delete({ where: { id: transaction.id } });
      deletedCount += 1;
      revalidatePath(`/lenders/${transaction.loan.lenderId}`);
    }

    revalidatePath('/transactions');

    return { deletedCount, skippedCount: skippedIds.length, skippedIds };
  });
