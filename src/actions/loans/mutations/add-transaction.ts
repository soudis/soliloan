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
import { checkNewTransaction, rejectionErrorKey } from '@/lib/loans/transaction-validation';
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
        transactions: true,
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

    const date = data.date ?? new Date();

    // Authoritative check: the ledger with the new Zahlung must not break any rule
    const { errors } = checkNewTransaction(loan, loanId, loan.transactions, {
      type: data.type,
      date,
      amount: data.amount,
    });
    if (errors.length > 0) {
      throw new Error(rejectionErrorKey(errors));
    }

    const amount = toStoredAmount(data.type, data.amount);

    // Create the transaction
    const transaction = await db.transaction.create({
      data: {
        type: data.type,
        date,
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
    revalidatePath(`/lenders/${loan.lenderId}`);
    invalidateDashboardWidgetResultsCache(loan.lender.projectId);

    if (data.notifyLender) {
      await notifyLenderAboutTransaction({
        to: loan.lender.email,
        transactionId: transaction.id,
        projectId: loan.lender.projectId,
      });
    }

    return { transaction };
  });
