'use server';

import { Entity, Operation, TransactionType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import {
  createAuditEntry,
  getLenderContext,
  getLoanContext,
  getTransactionContext,
  removeNullFields,
} from '@/lib/audit-trail';
import { calculateLoanFields } from '@/lib/calculations/loan-calculations';
import { db } from '@/lib/db';
import { isLoanEligibleForTransaction } from '@/lib/gocardless/import-matching';
import type {
  BankImportProtocol,
  BankImportProtocolImportedRow,
  BankImportProtocolRow,
  BankImportProtocolSkippedRow,
  BankImportSkipReason,
} from '@/lib/gocardless/import-protocol';
import { BANK_IMPORT_PAYMENT_TYPE, getSignedTransactionAmount } from '@/lib/gocardless/import-transaction-utils';
import { finalizeImportBatchSchema } from '@/lib/schemas/gocardless';
import { getLenderName } from '@/lib/utils';
import { parseAdditionalFields } from '@/lib/utils/additional-fields';
import { projectAction } from '@/lib/utils/safe-action';

function toProtocolRow(row: {
  id: string;
  bookingDate: Date;
  amount: number;
  currency: string;
  counterpartyName: string | null;
  remittanceInfo: string | null;
}): BankImportProtocolRow {
  return {
    rowId: row.id,
    bookingDate: row.bookingDate.toISOString(),
    amount: row.amount,
    currency: row.currency,
    counterpartyName: row.counterpartyName,
    remittanceInfo: row.remittanceInfo,
  };
}

function skip(
  skipped: BankImportProtocolSkippedRow[],
  row: Parameters<typeof toProtocolRow>[0],
  reason: BankImportSkipReason,
) {
  skipped.push({ ...toProtocolRow(row), reason });
}

export const finalizeImportBatchAction = projectAction
  .inputSchema(finalizeImportBatchSchema)
  .action(async ({ parsedInput: { projectId, rowIds } }) => {
    const imported: BankImportProtocolImportedRow[] = [];
    const skipped: BankImportProtocolSkippedRow[] = [];
    let maxBookingDate: Date | null = null;
    let connectionId: string | null = null;

    for (const rowId of rowIds) {
      const row = await db.bankImportRow.findUnique({
        where: { id: rowId },
        include: { batch: true },
      });

      if (!row || row.batch.projectId !== projectId) {
        if (row) {
          skip(skipped, row, 'rowNotFound');
        } else {
          skipped.push({
            rowId,
            bookingDate: new Date(0).toISOString(),
            amount: 0,
            currency: '',
            counterpartyName: null,
            remittanceInfo: null,
            reason: 'rowNotFound',
          });
        }
        continue;
      }

      connectionId = row.batch.connectionId;

      const type = row.amount > 0 ? TransactionType.DEPOSIT : row.selectedType;

      if (!type || !row.selectedLenderId || !row.selectedLoanId) {
        skip(skipped, row, 'incompleteAssignment');
        continue;
      }

      const loan = await db.loan.findUnique({
        where: { id: row.selectedLoanId },
        include: {
          lender: {
            include: {
              project: {
                include: {
                  configuration: { select: { interestMethod: true } },
                },
              },
            },
          },
          transactions: true,
        },
      });

      if (!loan || loan.lender.projectId !== projectId || loan.lenderId !== row.selectedLenderId) {
        skip(skipped, row, 'loanMismatch');
        continue;
      }

      const calculated = calculateLoanFields(
        parseAdditionalFields({
          ...loan,
          notes: [],
          files: [],
          lender: parseAdditionalFields({ ...loan.lender, notes: [], files: [] }),
        }),
        { toDate: row.bookingDate },
      );

      const amountMagnitude = Math.abs(row.amount);
      if (!isLoanEligibleForTransaction(calculated, type, amountMagnitude)) {
        skip(
          skipped,
          row,
          type === TransactionType.TERMINATION && calculated.balance > 0
            ? 'terminationBalanceMismatch'
            : 'notEligible',
        );
        continue;
      }

      const signedAmount = getSignedTransactionAmount(type, amountMagnitude);

      const created = await db.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
          data: {
            type,
            date: row.bookingDate,
            amount: signedAmount,
            paymentType: BANK_IMPORT_PAYMENT_TYPE,
            loanId: loan.id,
          },
        });

        await tx.importedBankTransaction.create({
          data: {
            connectionId: row.batch.connectionId,
            bankTransactionId: row.bankTransactionId,
            transactionId: transaction.id,
          },
        });

        await tx.bankImportRow.delete({ where: { id: row.id } });

        return transaction;
      });

      await createAuditEntry(db, {
        entity: Entity.transaction,
        operation: Operation.CREATE,
        primaryKey: created.id,
        before: {},
        after: removeNullFields(created),
        context: {
          ...getLenderContext(loan.lender),
          ...getLoanContext(loan),
          ...getTransactionContext(created),
        },
        projectId,
      });

      imported.push({
        ...toProtocolRow(row),
        transactionId: created.id,
        loanNumber: loan.loanNumber,
        lenderName: getLenderName(loan.lender),
        type,
      });

      if (!maxBookingDate || row.bookingDate > maxBookingDate) {
        maxBookingDate = row.bookingDate;
      }
    }

    if (imported.length > 0 && connectionId && maxBookingDate) {
      const connection = await db.bankConnection.findUnique({
        where: { id: connectionId },
        select: { lastImportedAt: true },
      });

      const nextWatermark =
        connection?.lastImportedAt && connection.lastImportedAt > maxBookingDate
          ? connection.lastImportedAt
          : maxBookingDate;

      await db.bankConnection.update({
        where: { id: connectionId },
        data: { lastImportedAt: nextWatermark },
      });
    }

    revalidatePath('/transactions');
    revalidatePath('/transactions/import');

    const remainingRows = await db.bankImportRow.count({
      where: { batch: { projectId } },
    });
    if (remainingRows === 0) {
      await db.bankImportBatch.deleteMany({ where: { projectId } });
    }

    const protocol: BankImportProtocol = {
      imported,
      skipped,
      importedCount: imported.length,
      skippedCount: skipped.length,
    };

    return protocol;
  });
