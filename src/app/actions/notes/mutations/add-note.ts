"use server";

import { revalidatePath } from "next/cache";

import {
  createAuditEntry,
  getLenderContext,
  getLoanContext,
  removeNullFields,
} from "@/lib/audit-trail";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NoteFormData } from "@/lib/schemas/note";

export async function addNote(loanId: string, data: NoteFormData) {
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

    // Create the note
    const note = await db.note.create({
      data: {
        text: data.text,
        public: data.public ?? false,
        loan: {
          connect: {
            id: loanId,
          },
        },
        createdBy: {
          connect: {
            id: session.user.id,
          },
        },
        createdAt: new Date(),
      },
    });

    // Create audit trail entry
    await createAuditEntry(db, {
      entity: "note",
      operation: "CREATE",
      primaryKey: note.id,
      before: {},
      after: removeNullFields(note),
      context: {
        ...getLenderContext(loan.lender),
        ...getLoanContext(loan),
      },
      projectId: loan.lender.project.id,
    });

    // Revalidate the loan page
    revalidatePath(`/loans/${loanId}`);

    return { note };
  } catch (error) {
    console.error("Error creating note:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to create note",
    };
  }
}
