'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';

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
import { checkChange, rejectionErrorKey } from '@/lib/loans/transaction-validation';
import { transactionIdSchema } from '@/lib/schemas/common';
import { transactionAction } from '@/lib/utils/safe-action';

export const deleteTransactionAction = transactionAction
  .inputSchema(transactionIdSchema)
  .action(async ({ parsedInput: { transactionId } }) => {
    const stored = await db.transaction.findUnique({ where: { id: transactionId }, select: { loanId: true } });
    if (!stored) {
      throw new Error('Transaction not found');
    }

    // Check and delete in one DB transaction that locks the Kredit, so parallel changes cannot both pass
    const transaction = await db.$transaction(async (tx) => {
      await lockLoan(tx, stored.loanId);
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: {
          loan: {
            include: {
              transactions: true,
              lender: { include: { project: { include: { configuration: true } } } },
            },
          },
        },
      });
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Any Zahlung can be deleted as long as the remaining ledger stays valid
      const { transactions } = transaction.loan;
      const { errors } = checkChange(
        transaction.loan,
        transactions,
        transactions.filter((item) => item.id !== transactionId),
        transaction.date,
      );
      if (errors.length > 0) {
        throw new Error(rejectionErrorKey(errors, 'error.transaction.deleteInvalid'));
      }

      await tx.transaction.delete({ where: { id: transactionId } });
      return transaction;
    });

    await createAuditEntry(db, {
      entity: Entity.transaction,
      operation: Operation.DELETE,
      primaryKey: transactionId,
      before: removeNullFields(transaction),
      after: {},
      context: {
        ...getLenderContext(transaction.loan.lender),
        ...getLoanContext(transaction.loan),
        ...getTransactionContext(transaction),
      },
      projectId: transaction.loan.lender.projectId,
    });

    // Revalidate the lender page (loans are viewed within lender detail)
    revalidatePath(`/lenders/${transaction.loan.lenderId}`);
    revalidatePath('/transactions/list');
    invalidateDashboardWidgetResultsCache(transaction.loan.lender.projectId);

    return { success: true };
  });
