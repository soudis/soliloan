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
import { invalidateDashboardWidgetResultsCache } from '@/lib/dashboard/widget-results-cache';
import { db } from '@/lib/db';
import type {
  BankImportProtocol,
  BankImportProtocolImportedRow,
  BankImportProtocolRow,
  BankImportProtocolSkippedRow,
  BankImportSkipReason,
} from '@/lib/gocardless/import-protocol';
import { BANK_IMPORT_PAYMENT_TYPE, getSignedTransactionAmount } from '@/lib/gocardless/import-transaction-utils';
import { sortRowsForBooking } from '@/lib/gocardless/import-order';
import { lockLoan } from '@/lib/loans/loan-lock';
import { DRAFT_TRANSACTION_ID, checkNewTransaction } from '@/lib/loans/transaction-validation';
import { finalizeImportBatchSchema } from '@/lib/schemas/gocardless';
import { getLenderName } from '@/lib/utils';
import { projectAction } from '@/lib/utils/safe-action';

/** Zahlungen a bank import can create. */
const IMPORTABLE_TYPES: TransactionType[] = [
  TransactionType.DEPOSIT,
  TransactionType.WITHDRAWAL,
  TransactionType.INTERESTPAYMENT,
  TransactionType.TERMINATION,
];

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

    const rows = await db.bankImportRow.findMany({
      where: { id: { in: rowIds } },
      include: { batch: true },
    });
    const foundIds = new Set(rows.map((row) => row.id));
    for (const rowId of rowIds.filter((id) => !foundIds.has(id))) {
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

    // Oldest first: each row is checked against the Zahlungen booked before it
    for (const row of sortRowsForBooking(rows)) {
      if (row.batch.projectId !== projectId) {
        skip(skipped, row, 'rowNotFound');
        continue;
      }

      connectionId = row.batch.connectionId;

      const type = row.amount > 0 ? TransactionType.DEPOSIT : row.selectedType;
      const loanId = row.selectedLoanId;

      if (!type || !row.selectedLenderId || !loanId) {
        skip(skipped, row, 'incompleteAssignment');
        continue;
      }

      const amountMagnitude = Math.abs(row.amount);
      if (amountMagnitude <= 0 || !IMPORTABLE_TYPES.includes(type)) {
        skip(skipped, row, 'notEligible');
        continue;
      }

      // Check and book in one DB transaction that locks the Kredit, so parallel saves cannot both pass
      const result = await db.$transaction(async (tx) => {
        await lockLoan(tx, loanId);
        const loan = await tx.loan.findUnique({
          where: { id: loanId },
          include: {
            lender: {
              include: {
                project: {
                  include: {
                    configuration: { select: { interestMethod: true, interestChangeoverYear: true } },
                  },
                },
              },
            },
            transactions: true,
          },
        });

        if (!loan || loan.lender.projectId !== projectId || loan.lenderId !== row.selectedLenderId) {
          return { skip: 'loanMismatch' as const };
        }

        const { errors, after } = checkNewTransaction(loan, loan.id, loan.transactions, {
          type,
          date: row.bookingDate,
          amount: amountMagnitude,
        });
        if (errors.length > 0) {
          return { skip: 'notEligible' as const };
        }

        // A Rückzahlung from the bank has to match the Kontostand on its day
        const closing = after.closingDifferences.find((item) => item.transactionId === DRAFT_TRANSACTION_ID);
        if (closing && Math.abs(closing.difference) > 0.001) {
          return { skip: 'terminationBalanceMismatch' as const };
        }

        const created = await tx.transaction.create({
          data: {
            type,
            date: row.bookingDate,
            amount: getSignedTransactionAmount(type, amountMagnitude),
            paymentType: BANK_IMPORT_PAYMENT_TYPE,
            loanId: loan.id,
          },
        });

        await tx.importedBankTransaction.create({
          data: {
            connectionId: row.batch.connectionId,
            bankTransactionId: row.bankTransactionId,
            transactionId: created.id,
          },
        });

        await tx.bankImportRow.delete({ where: { id: row.id } });

        return { skip: undefined, loan, created };
      });

      if (result.skip) {
        skip(skipped, row, result.skip);
        continue;
      }
      const { loan, created } = result;

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

    revalidatePath('/transactions/list');
    revalidatePath('/transactions/import');
    invalidateDashboardWidgetResultsCache(projectId);

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
