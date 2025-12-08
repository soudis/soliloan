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
import { db } from '@/lib/db';
import { transactionIdSchema } from '@/lib/schemas/common';
import { transactionAction } from '@/lib/utils/safe-action';

export const deleteTransactionAction = transactionAction
  .inputSchema(transactionIdSchema)
  .action(async ({ parsedInput: { transactionId } }) => {
    // Fetch the loan and transaction
    // Need transaction with loan to identify loanId?
    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
      include: {
        loan: {
          include: {
            lender: {
              include: {
                project: {
                  include: {
                    configuration: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Create audit trail entry before deletion
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

    // Delete the transaction
    await db.transaction.delete({
      where: {
        id: transactionId,
      },
    });

    // Revalidate the loan page
    revalidatePath(`/loans/${transaction.loanId}`);

    return { success: true };
  });
