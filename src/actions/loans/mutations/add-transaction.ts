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
import { transactionFormSchema } from '@/lib/schemas/transaction';
import { loanAction } from '@/lib/utils/safe-action';

// We need to extend the combined schema properly
export const addTransactionAction = loanAction
  .schema(
    z.object({
      loanId: z.string(),
      data: transactionFormSchema,
    }),
  )
  .action(async ({ parsedInput: { loanId, data } }) => {
    // Fetch the loan for audit context (and verification)
    const loan = await db.loan.findUnique({
      where: {
        id: loanId,
      },
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
    });

    if (!loan) {
      throw new Error('Loan not found');
    }

    const amount =
      data.type === TransactionType.WITHDRAWAL ||
      data.type === TransactionType.TERMINATION ||
      data.type === TransactionType.INTERESTPAYMENT ||
      data.type === TransactionType.NOTRECLAIMEDPARTIAL ||
      data.type === TransactionType.NOTRECLAIMED
        ? -Math.abs(data.amount)
        : data.amount;

    // Create the transaction
    const transaction = await db.transaction.create({
      data: {
        type: data.type,
        date: data.date ?? new Date(),
        amount,
        paymentType: data.paymentType,
        loan: {
          connect: {
            id: loanId,
          },
        },
      },
    });

    // Create audit trail entry
    await createAuditEntry(db, {
      entity: Entity.transaction,
      operation: Operation.CREATE,
      primaryKey: transaction.id,
      before: {},
      after: removeNullFields(transaction),
      context: {
        ...getLenderContext(loan.lender),
        ...getLoanContext(loan),
        ...getTransactionContext(transaction),
      },
      projectId: loan.lender.projectId,
    });

    // Revalidate the lender page (loans are viewed within lender detail)
    revalidatePath(`/${loan.lender.projectId}/lenders/${loan.lenderId}`);

    return { transaction };
  });
