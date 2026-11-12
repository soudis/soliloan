'use server';

import { Entity, Operation, type Transaction, TransactionType } from '@prisma/client';
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
import { checkChange } from '@/lib/loans/transaction-validation';
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
            transactions: true,
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
      reason: 'notFound' | 'interest' | 'invalid';
    }[] = transactionIds
      .filter((id) => !foundIds.has(id))
      .map((id) => ({ id, loanNumber: null, lenderName: null, reason: 'notFound' as const }));

    const ledgers = new Map<string, Transaction[]>();

    for (const transaction of transactions) {
      const loanNumber = transaction.loan.loanNumber;
      const lenderName = getLenderName(transaction.loan.lender);

      if (transaction.type === TransactionType.INTEREST) {
        skipped.push({ id: transaction.id, loanNumber, lenderName, reason: 'interest' });
        continue;
      }

      // Each deletion is checked against the ledger as left by the previous ones
      const remaining = ledgers.get(transaction.loanId) ?? transaction.loan.transactions;
      const proposed = remaining.filter((item) => item.id !== transaction.id);
      const { errors } = checkChange(transaction.loan, remaining, proposed, transaction.date);
      if (errors.length > 0) {
        skipped.push({ id: transaction.id, loanNumber, lenderName, reason: 'invalid' });
        continue;
      }
      ledgers.set(transaction.loanId, proposed);

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
