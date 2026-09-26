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
import { invalidateDashboardWidgetResultsCache } from '@/lib/dashboard/widget-results-cache';
import { db } from '@/lib/db';
import { getLenderName } from '@/lib/utils';
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

    const foundIds = new Set(transactions.map((transaction) => transaction.id));
    let deletedCount = 0;
    const skipped: {
      id: string;
      loanNumber: number | null;
      lenderName: string | null;
      reason: 'notFound' | 'interest' | 'notLatest';
    }[] = transactionIds
      .filter((id) => !foundIds.has(id))
      .map((id) => ({ id, loanNumber: null, lenderName: null, reason: 'notFound' as const }));

    for (const transaction of transactions) {
      const loanNumber = transaction.loan.loanNumber;
      const lenderName = getLenderName(transaction.loan.lender);

      if (transaction.type === TransactionType.INTEREST) {
        skipped.push({ id: transaction.id, loanNumber, lenderName, reason: 'interest' });
        continue;
      }

      const lastNonInterest = [...transaction.loan.transactions]
        .reverse()
        .find((tx) => tx.type !== TransactionType.INTEREST);

      if (lastNonInterest?.id !== transaction.id) {
        skipped.push({ id: transaction.id, loanNumber, lenderName, reason: 'notLatest' });
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

    revalidatePath('/transactions/list');
    invalidateDashboardWidgetResultsCache(projectId);

    return { deletedCount, skipped };
  });
