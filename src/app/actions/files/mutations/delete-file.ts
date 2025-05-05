"use server";

import { Entity, Operation } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  createAuditEntry,
  getFileContext,
  getLenderContext,
  getLoanContext,
  removeNullFields,
} from "@/lib/audit-trail";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function deleteFile(loanId: string, fileId: string) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error("Unauthorized");
    }

    // Fetch the loan and file
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
        files: {
          where: {
            id: fileId,
          },
        },
      },
    });

    if (!loan) {
      throw new Error("Loan not found");
    }

    const file = loan.files[0];
    if (!file) {
      throw new Error("File not found");
    }

    // Check if the user has access to the loan's project
    const hasAccess = loan.lender.project.managers.some(
      (manager) => manager.id === session.user.id
    );

    if (!hasAccess) {
      throw new Error("You do not have access to this loan");
    }

    // Create audit trail entry before deletion
    const fileForAudit = {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      public: file.public,
      description: file.description,
      lenderId: file.lenderId,
      loanId: file.loanId,
    };

    await createAuditEntry(db, {
      entity: Entity.file,
      operation: Operation.DELETE,
      primaryKey: fileId,
      before: removeNullFields(fileForAudit),
      after: {},
      context: {
        ...getLenderContext(loan.lender),
        ...getLoanContext(loan),
        ...getFileContext(file),
      },
      projectId: loan.lender.project.id,
    });

    // Delete the file
    await db.file.delete({
      where: {
        id: fileId,
      },
    });

    // Revalidate the loan page
    revalidatePath(`/loans/${loanId}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting file:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to delete file",
    };
  }
}
