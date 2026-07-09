'use server';

import { revalidatePath } from 'next/cache';

import { getLoansByProjectUnsafe } from '@/actions/loans/queries/get-loans-by-project';
import { db } from '@/lib/db';
import { getAccountTransactions } from '@/lib/gocardless/client';
import { defaultTransactionTypeForAmount, matchLender, matchLoanForDeposit } from '@/lib/gocardless/import-matching';
import { parseBookedTransactions } from '@/lib/gocardless/parse-transactions';
import { loadImportBatchSchema } from '@/lib/schemas/gocardless';
import { projectAction } from '@/lib/utils/safe-action';

import { getImportBatch, getLinkedBankConnection } from '../queries/get-import-batch';

export const loadImportBatchAction = projectAction
  .inputSchema(loadImportBatchSchema)
  .action(async ({ parsedInput: { projectId, accountId } }) => {
    const connection = await getLinkedBankConnection(projectId);
    if (!connection) {
      throw new Error('error.gocardless.notLinked');
    }
    if (!connection.accountIds.includes(accountId)) {
      throw new Error('error.gocardless.accountNotFound');
    }

    const [lenders, loansResult] = await Promise.all([
      db.lender.findMany({
        where: { projectId },
        select: {
          id: true,
          iban: true,
          type: true,
          firstName: true,
          lastName: true,
          organisationName: true,
          titlePrefix: true,
          titleSuffix: true,
        },
      }),
      getLoansByProjectUnsafe(projectId),
    ]);

    const loans = 'loans' in loansResult && loansResult.loans ? loansResult.loans : [];

    let batch = await db.bankImportBatch.findUnique({ where: { projectId } });

    if (batch && batch.accountId !== accountId) {
      await db.bankImportRow.deleteMany({ where: { batchId: batch.id } });
      batch = await db.bankImportBatch.update({
        where: { id: batch.id },
        data: { accountId, connectionId: connection.id },
      });
    } else if (!batch) {
      batch = await db.bankImportBatch.create({
        data: {
          projectId,
          connectionId: connection.id,
          accountId,
        },
      });
    } else if (batch.connectionId !== connection.id) {
      batch = await db.bankImportBatch.update({
        where: { id: batch.id },
        data: { connectionId: connection.id },
      });
    }

    const defaultLookback = new Date();
    defaultLookback.setDate(defaultLookback.getDate() - 90);
    const dateFrom = connection.lastImportedAt ?? defaultLookback;

    const gcResponse = await getAccountTransactions(accountId, dateFrom);
    const parsed = parseBookedTransactions(gcResponse.transactions?.booked ?? []);

    const [importedRows, existingRows] = await Promise.all([
      db.importedBankTransaction.findMany({
        where: { connectionId: connection.id },
        select: { bankTransactionId: true },
      }),
      db.bankImportRow.findMany({
        where: { batchId: batch.id },
        select: { bankTransactionId: true },
      }),
    ]);

    const skipIds = new Set([
      ...importedRows.map((r) => r.bankTransactionId),
      ...existingRows.map((r) => r.bankTransactionId),
    ]);

    const newTransactions = parsed.filter((tx) => !skipIds.has(tx.bankTransactionId));
    let addedCount = 0;

    if (newTransactions.length > 0) {
      const rowData = newTransactions.map((tx) => {
        const suggestedLenderId = matchLender(
          {
            counterpartyName: tx.counterpartyName,
            counterpartyIban: tx.counterpartyIban,
          },
          lenders,
        );

        let suggestedLoanId: string | null = null;
        let selectedLoanId: string | null = null;
        const selectedType = defaultTransactionTypeForAmount(tx.amount);

        if (suggestedLenderId && tx.amount > 0) {
          const lenderLoans = loans.filter((loan) => loan.lender.id === suggestedLenderId);
          suggestedLoanId = matchLoanForDeposit(lenderLoans, tx.amount);
          selectedLoanId = suggestedLoanId;
        }

        return {
          batchId: batch.id,
          bankTransactionId: tx.bankTransactionId,
          bookingDate: tx.bookingDate,
          valueDate: tx.valueDate,
          amount: tx.amount,
          currency: tx.currency,
          counterpartyName: tx.counterpartyName,
          counterpartyIban: tx.counterpartyIban,
          remittanceInfo: tx.remittanceInfo,
          raw: tx.raw as object,
          suggestedLenderId,
          suggestedLoanId,
          selectedLenderId: suggestedLenderId,
          selectedLoanId,
          selectedType,
        };
      });

      const result = await db.bankImportRow.createMany({
        data: rowData,
        skipDuplicates: true,
      });
      addedCount = result.count;
    }

    await db.bankImportBatch.update({
      where: { id: batch.id },
      data: { lastFetchedAt: new Date() },
    });

    revalidatePath('/transactions/import');

    const refreshed = await getImportBatch(projectId);
    return { addedCount, batch: refreshed };
  });
