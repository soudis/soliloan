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
import { toStoredAmount } from '@/lib/calculations/transaction-ledger';
import { lockLoan } from '@/lib/loans/loan-lock';
import { checkNewTransaction, rejectionErrorKey } from '@/lib/loans/transaction-validation';
import { transactionFormSchema } from '@/lib/schemas/transaction';
import { loanAction } from '@/lib/utils/safe-action';

// We need to extend the combined schema properly
export const addTransactionAction = loanAction
  .inputSchema(
    z.object({
      loanId: z.string(),
      data: transactionFormSchema,
    }),
  )
  .action(async ({ parsedInput: { loanId, data } }) => {
    const date = data.date ?? new Date();

    // Check and write in one DB transaction that locks the Kredit, so parallel saves cannot both pass
    const { loan, transaction } = await db.$transaction(async (tx) => {
      await lockLoan(tx, loanId);
      const loan = await tx.loan.findUnique({
        where: { id: loanId },
        include: {
          transactions: true,
          lender: { include: { project: { include: { configuration: true } } } },
        },
      });
      if (!loan) {
        throw new Error('Loan not found');
      }

      // Authoritative check: the ledger with the new Zahlung must not break any rule
      const { errors } = checkNewTransaction(loan, loanId, loan.transactions, {
        type: data.type,
        date,
        amount: data.amount,
      });
      if (errors.length > 0) {
        throw new Error(rejectionErrorKey(errors));
      }

      const transaction = await tx.transaction.create({
        data: {
          type: data.type,
          date,
          amount: toStoredAmount(data.type, data.amount),
          paymentType: data.paymentType,
          loan: { connect: { id: loanId } },
        },
      });
      return { loan, transaction };
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
