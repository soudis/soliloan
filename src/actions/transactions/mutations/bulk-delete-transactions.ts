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
import { lockLoan } from '@/lib/loans/loan-lock';
import { checkChange } from '@/lib/loans/transaction-validation';
import { getLenderName } from '@/lib/utils';
import { sortTransactions } from '@/lib/utils/sorters';
import { projectAction } from '@/lib/utils/safe-action';

const bulkDeleteTransactionsSchema = z.object({
  projectId: z.string(),
  transactionIds: z.array(z.string()).min(1),
});

export const bulkDeleteTransactionsAction = projectAction
  .inputSchema(bulkDeleteTransactionsSchema)
  .action(async ({ parsedInput: { projectId, transactionIds } }) => {
    const transactions = await db.transaction.findMany({
      where: {
        id: { in: transactionIds },
        loan: { lender: { projectId } },
      },
      include: {
        loan: {
          include: {
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

    // Latest first: a Zahlung that relies on an earlier one (a Teilrückzahlung on its Einzahlung) is
    // deleted before it, so selecting both deletes both whatever order the database returns
    for (const transaction of sortTransactions(transactions).reverse()) {
      const loanNumber = transaction.loan.loanNumber;
      const lenderName = getLenderName(transaction.loan.lender);

      if (transaction.type === TransactionType.INTEREST) {
        skipped.push({ id: transaction.id, loanNumber, lenderName, reason: 'interest' });
        continue;
      }

      // Check and delete in one DB transaction that locks the Kredit: each deletion is checked against
      // the ledger as left by the previous ones (and by parallel saves)
      const outcome = await db.$transaction(async (tx) => {
        await lockLoan(tx, transaction.loanId);
        const loan = await tx.loan.findUnique({
          where: { id: transaction.loanId },
          include: {
            transactions: true,
            lender: { include: { project: { include: { configuration: true } } } },
          },
        });
        if (!loan?.transactions.some((item) => item.id === transaction.id)) {
          return 'notFound' as const;
        }
        const remaining = loan.transactions.filter((item) => item.id !== transaction.id);
        const { errors } = checkChange(loan, loan.transactions, remaining, transaction.date);
        if (errors.length > 0) {
          return 'invalid' as const;
        }
        await tx.transaction.delete({ where: { id: transaction.id } });
        return 'deleted' as const;
      });
      if (outcome !== 'deleted') {
        skipped.push({ id: transaction.id, loanNumber, lenderName, reason: outcome });
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

      deletedCount += 1;
      revalidatePath(`/lenders/${transaction.loan.lenderId}`);
    }

    revalidatePath('/transactions/list');
    invalidateDashboardWidgetResultsCache(projectId);

    return { deletedCount, skipped };
  });
