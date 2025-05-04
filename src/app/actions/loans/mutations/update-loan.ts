"use server";

import {
  ContractStatus,
  DurationType,
  Entity,
  InterestMethod,
  InterestPaymentType,
  InterestPayoutType,
  Operation,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  createAuditEntry,
  getChangedFields,
  getLenderContext,
  getLoanContext,
} from "@/lib/audit-trail";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { LoanFormData } from "@/lib/schemas/loan";

export async function updateLoan(loanId: string, data: LoanFormData) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error("Unauthorized");
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
      throw new Error("Loan not found");
    }

    // Check if the user has access to the loan's project
    const hasAccess = loan.lender.project.managers.some(
      (manager) => manager.id === session.user.id
    );

    if (!hasAccess) {
      throw new Error("You do not have access to this loan");
    }

    // Update the loan
    const updatedLoan = await db.loan.update({
      where: {
        id: loanId,
      },
      data: {
        signDate: data.signDate || undefined,
        interestPaymentType: data.interestPaymentType as InterestPaymentType,
        interestPayoutType: data.interestPayoutType as InterestPayoutType,
        terminationType: data.terminationType,
        endDate: data.endDate || undefined,
        terminationDate: data.terminationDate || undefined,
        terminationPeriod: Number(data.terminationPeriod),
        terminationPeriodType: data.terminationPeriodType as DurationType,
        duration: Number(data.duration),
        durationType: data.durationType as DurationType,
        amount: data.amount || undefined,
        interestRate: data.interestRate || undefined,
        altInterestMethod: data.altInterestMethod as InterestMethod,
        contractStatus: data.contractStatus as ContractStatus,
      },
    });

    // Create audit trail entry
    const { before, after } = getChangedFields(loan, updatedLoan);
    if (Object.keys(before).length > 0) {
      await createAuditEntry(db, {
        entity: Entity.loan,
        operation: Operation.UPDATE,
        primaryKey: loanId,
        before,
        after,
        context: {
          ...getLenderContext(loan.lender),
          ...getLoanContext(updatedLoan),
        },
        projectId: loan.lender.project.id,
      });
    }

    // Revalidate the loans page
    revalidatePath(`/dashboard/loans/${loan.lenderId}`);

    return { loan: updatedLoan };
  } catch (error) {
    console.error("Error updating loan:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to update loan",
    };
  }
}
