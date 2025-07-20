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
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import type { TransactionFormData } from '@/lib/schemas/transaction';

export async function addTransaction(loanId: string, data: TransactionFormData) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    // Fetch the loan
    const loan = await db.loan.findUnique({
      where: {
        id: loanId,
      },
      include: {
        lender: {
          include: {
            project: {
              include: {
                managers: true,
              },
            },
          },
        },
      },
    });

    if (!loan) {
      throw new Error('Loan not found');
    }

    // Check if the user has access to the loan's project
    const hasAccess = loan.lender.project.managers.some((manager) => manager.id === session.user.id);

    if (!hasAccess) {
      throw new Error('You do not have access to this loan');
    }

    const amount =
      data.type === 'WITHDRAWAL' ||
      data.type === 'TERMINATION' ||
      data.type === 'INTERESTPAYMENT' ||
      data.type === 'NOTRECLAIMEDPARTIAL' ||
      data.type === 'NOTRECLAIMED'
        ? -Math.abs(data.amount)
        : data.amount;

    // Create the transaction
    const transaction = await db.transaction.create({
      data: {
        type: data.type,
        date: data.date as Date,
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
      projectId: loan.lender.project.id,
    });

    // Revalidate the loan page
    revalidatePath(`/loans/${loanId}`);

    return { transaction };
  } catch (error) {
    console.error('Error creating transaction:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to create transaction',
    };
  }
}
