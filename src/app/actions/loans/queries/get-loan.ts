"use server";

import { Loan } from "@prisma/client";

import { auth } from "@/lib/auth";
import { calculateLoanFields } from "@/lib/calculations/loan-calculations";
import { db } from "@/lib/db";
import { LoanWithRelations } from "@/types/loans";

export async function getLoanById(loanId: string) {
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
                configuration: { select: { interestMethod: true } },
              },
            },
            user: {
              select: {
                name: true,
                id: true,
                email: true,
                lastLogin: true,
                lastInvited: true,
              },
            },
            notes: {
              include: { createdBy: { select: { id: true, name: true } } },
            },
            files: {
              select: {
                id: true,
                name: true,
                description: true,
                public: true,
                mimeType: true,
                lenderId: true,
                loanId: true,
                thumbnail: true,
              },
            },
          },
        },
        transactions: true,
        notes: { include: { createdBy: { select: { id: true, name: true } } } },
        files: {
          select: {
            id: true,
            name: true,
            description: true,
            public: true,
            mimeType: true,
            lenderId: true,
            loanId: true,
            thumbnail: true,
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

    // Calculate virtual fields
    const loanWithCalculations =
      calculateLoanFields<Omit<LoanWithRelations, keyof Loan>>(loan);

    return { loan: loanWithCalculations };
  } catch (error) {
    console.error("Error fetching loan:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to fetch loan",
    };
  }
}
