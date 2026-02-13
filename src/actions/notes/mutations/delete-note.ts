'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createAuditEntry, getLenderContext, getLoanContext, removeNullFields } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { noteAction } from '@/lib/utils/safe-action';

export const deleteNoteAction = noteAction
  .inputSchema(
    z.object({
      noteId: z.string(),
    }),
  )
  .action(async ({ parsedInput: { noteId }, ctx }) => {
    // Fetch the note with context info
    const note = await db.note.findUnique({
      where: {
        id: noteId,
      },
      include: {
        lender: true,
        loan: true,
      },
    });

    if (!note || !note.lender) {
      throw new Error('error.note.notFound');
    }

    // Create audit trail entry before deletion
    await createAuditEntry(db, {
      entity: Entity.note,
      operation: Operation.DELETE,
      primaryKey: noteId,
      before: removeNullFields(note),
      after: {},
      context: {
        ...getLenderContext(note.lender),
        ...(note.loan && getLoanContext(note.loan)),
      },
      projectId: note.lender.projectId,
    });

    // Delete the note
    await db.note.delete({
      where: { id: noteId },
    });

    // Revalidate paths
    revalidatePath(`/lenders/${note.lenderId}`);
    if (note.loanId) {
      revalidatePath(`/loans/${note.loanId}`);
    }

    return { success: true };
  });
