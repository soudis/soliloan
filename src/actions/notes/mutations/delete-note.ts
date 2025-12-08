'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createAuditEntry, getLenderContext, getLoanContext, removeNullFields } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { managerAction } from '@/lib/utils/safe-action';

export const deleteNoteAction = managerAction
  .inputSchema(
    z.object({
      loanId: z.string(),
      noteId: z.string(),
    }),
  )
  .action(async ({ parsedInput: { loanId, noteId }, ctx }) => {
    // Fetch the loan and note
    const loan = await db.loan.findUnique({
      where: {
        id: loanId,
      },
      include: {
        lender: {
          include: {
            project: {
              include: { managers: true },
            },
          },
        },
        notes: {
          where: {
            id: noteId,
          },
        },
      },
    });

    if (!loan) {
      throw new Error('error.loan.notFound');
    }

    const note = loan.notes[0];
    if (!note) {
      throw new Error('error.note.notFound');
    }

    // Check if the user has access to the loan's project
    const hasAccess =
      ctx.session.user.isAdmin || loan.lender.project.managers.some((manager) => manager.id === ctx.session.user.id);

    if (!hasAccess) {
      throw new Error('error.unauthorized');
    }

    // Create audit trail entry before deletion
    await createAuditEntry(db, {
      entity: 'note',
      operation: 'DELETE',
      primaryKey: noteId,
      before: removeNullFields(note),
      after: {},
      context: {
        ...getLenderContext(loan.lender),
        ...getLoanContext(loan),
      },
      projectId: loan.lender.projectId,
    });

    // Delete the note
    await db.note.delete({
      where: { id: noteId },
    });

    // Revalidate the loan page
    revalidatePath(`/loans/${loanId}`);

    return { success: true };
  });
