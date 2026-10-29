'use server';

import { Entity, Operation } from '@prisma/client';
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
import { notifyLenderAboutTransaction } from '@/lib/email';
import { toStoredAmount } from '@/lib/loans/transaction-ledger';
import { checkChange } from '@/lib/loans/transaction-validation';
import { transactionFormSchema } from '@/lib/schemas/transaction';
import { transactionAction } from '@/lib/utils/safe-action';

export const updateTransactionAction = transactionAction
  .inputSchema(z.object({ transactionId: z.string(), data: transactionFormSchema }))
  .action(async ({ parsedInput: { transactionId, data } }) => {
    const transaction = await db.transaction.findUnique({
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
      throw new Error('error.transaction.notFound');
    }

    const { loan } = transaction;
    const date = data.date ?? transaction.date;
    const amount = toStoredAmount(data.type, data.amount);

    // Authoritative check: the ledger without the old version but with the new one must not break any rule
    const proposed = loan.transactions.map((item) =>
      item.id === transactionId ? { ...item, type: data.type, date, amount, paymentType: data.paymentType } : item,
    );
    const earliest = new Date(Math.min(transaction.date.getTime(), date.getTime()));
    const { errors } = checkChange(loan, loan.transactions, proposed, earliest);
    if (errors.length > 0) {
      throw new Error('error.transaction.invalid');
    }

    const updated = await db.transaction.update({
      where: { id: transactionId },
      data: { type: data.type, date, amount, paymentType: data.paymentType },
    });

    await createAuditEntry(db, {
      entity: Entity.transaction,
      operation: Operation.UPDATE,
      primaryKey: updated.id,
      before: removeNullFields(transaction),
      after: removeNullFields(updated),
      context: {
        ...getLenderContext(loan.lender),
        ...getLoanContext(loan),
        ...getTransactionContext(updated),
      },
      projectId: loan.lender.projectId,
    });

    revalidatePath(`/lenders/${loan.lenderId}`);
    revalidatePath('/transactions/list');
    invalidateDashboardWidgetResultsCache(loan.lender.projectId);

    if (data.notifyLender) {
      await notifyLenderAboutTransaction({
        to: loan.lender.email,
        transactionId: updated.id,
        projectId: loan.lender.projectId,
      });
    }

    return { transaction: updated };
  });
