'use server';

import { TransactionType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { db } from '@/lib/db';
import { notifyLenderAboutTransaction, renderTransactionNotificationEmail } from '@/lib/email';
import { projectAction } from '@/lib/utils/safe-action';

const previewSchema = z.object({
  projectId: z.string(),
  transactionIds: z.array(z.string()).min(1),
});

const sendSchema = previewSchema.extend({
  resendAlreadyNotified: z.boolean(),
});

async function loadTransactions(projectId: string, transactionIds: string[]) {
  const loaded = await db.transaction.findMany({
    where: {
      id: { in: transactionIds },
      loan: { lender: { projectId } },
    },
    include: { loan: { include: { lender: { select: { email: true } } } } },
  });
  const byId = new Map(loaded.map((transaction) => [transaction.id, transaction]));
  return transactionIds.flatMap((id) => {
    const transaction = byId.get(id);
    return transaction ? [transaction] : [];
  });
}

export const previewNotifyTransactionsAction = projectAction
  .schema(previewSchema)
  .action(async ({ parsedInput: { projectId, transactionIds } }) => {
    const transactions = await loadTransactions(projectId, transactionIds);
    const real = transactions.filter((transaction) => transaction.type !== TransactionType.INTEREST);
    const alreadyNotifiedCount = real.filter((transaction) => transaction.lenderNotifiedAt != null).length;
    const missingEmailCount = real.filter((transaction) => !transaction.loan.lender.email?.trim()).length;
    const sampleTransaction = real[0];
    const sample = sampleTransaction
      ? await renderTransactionNotificationEmail({
          transactionId: sampleTransaction.id,
          projectId,
        })
      : null;

    return {
      sample,
      alreadyNotifiedCount,
      missingEmailCount,
      realCount: real.length,
    };
  });

export const sendNotifyTransactionsAction = projectAction
  .schema(sendSchema)
  .action(async ({ parsedInput: { projectId, transactionIds, resendAlreadyNotified } }) => {
    const transactions = await loadTransactions(projectId, transactionIds);
    let sent = 0;
    let skippedAlreadyNotified = 0;
    let skippedMissingEmail = 0;
    let failed = 0;

    for (const transaction of transactions) {
      if (transaction.type === TransactionType.INTEREST) {
        continue;
      }
      if (transaction.lenderNotifiedAt && !resendAlreadyNotified) {
        skippedAlreadyNotified += 1;
        continue;
      }
      const result = await notifyLenderAboutTransaction({
        to: transaction.loan.lender.email,
        transactionId: transaction.id,
        projectId,
      });
      if (result === 'sent') sent += 1;
      else if (result === 'failed') failed += 1;
      else skippedMissingEmail += 1;
    }

    revalidatePath('/transactions/list');

    return { sent, skippedAlreadyNotified, skippedMissingEmail, failed };
  });
