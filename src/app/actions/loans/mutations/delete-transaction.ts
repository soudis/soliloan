"use server";

import { Entity, Operation } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  createAuditEntry,
  getLenderContext,
  getLoanContext,
  getTransactionContext,
  removeNullFields,
} from "@/lib/audit-trail";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function deleteTransaction(loanId: string, transactionId: string) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error("Unauthorized");
    }

    // Fetch the loan and transaction
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
        transactions: {
          where: {
            id: transactionId,
          },
        },
      },
    });

    if (!loan) {
      throw new Error("Loan not found");
    }

    const transaction = loan.transactions[0];
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    // Check if the user has access to the loan's project
    const hasAccess = loan.lender.project.managers.some(
      (manager) => manager.id === session.user.id
    );

    if (!hasAccess) {
      throw new Error("You do not have access to this loan");
    }

    // Create audit trail entry before deletion
    await createAuditEntry(db, {
      entity: Entity.transaction,
      operation: Operation.DELETE,
      primaryKey: transactionId,
      before: removeNullFields(transaction),
      after: {},
      context: {
        ...getLenderContext(loan.lender),
        ...getLoanContext(loan),
        ...getTransactionContext(transaction),
      },
      projectId: loan.lender.project.id,
    });

    // Delete the transaction
    await db.transaction.delete({
      where: {
        id: transactionId,
      },
    });

    // Revalidate the loan page
    revalidatePath(`/loans/${loanId}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete transaction",
    };
  }
}
