'use server';

import { TransactionType } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { previewTransaction } from '@/lib/loans/transaction-validation';
import { loanAction } from '@/lib/utils/safe-action';

/**
 * Everything the transaction modal shows for a date: possible types with reasons, amount limits,
 * errors and warnings. Create and edit use the same query; an edit passes `transactionId`.
 */
export const previewTransactionAction = loanAction
  .inputSchema(
    z.object({
      loanId: z.string(),
      transactionId: z.string().optional(),
      date: z.coerce.date(),
      type: z.nativeEnum(TransactionType).optional(),
      amount: z.number().optional(),
    }),
  )
  .action(async ({ parsedInput: { loanId, transactionId, date, type, amount } }) => {
    const loan = await db.loan.findUnique({
      where: { id: loanId },
      include: {
        transactions: true,
        lender: { include: { project: { include: { configuration: { select: { interestMethod: true } } } } } },
      },
    });

    if (!loan) {
      throw new Error('error.loan.notFound');
    }

    return {
      preview: previewTransaction({
        loan,
        loanId,
        transactions: loan.transactions,
        draft: { transactionId, date, type, amount },
      }),
    };
  });
