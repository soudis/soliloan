'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createAuditEntry, getLenderContext, getLoanContext, removeNullFields } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { noteSchema } from '@/lib/schemas/note';
import { lenderAction } from '@/lib/utils/safe-action';

export const updateNoteAction = lenderAction
  .inputSchema(
    z.object({
      noteId: z.string(),
      lenderId: z.string(),
      loanId: z.string().optional(),
      data: noteSchema,
    }),
  )
  .action(async ({ parsedInput: { noteId, lenderId, loanId, data }, ctx }) => {
    // Fetch the existing note
    const existingNote = await db.note.findUnique({
      where: { id: noteId },
    });

    if (!existingNote) {
      throw new Error('error.note.notFound');
    }

    // Fetch lender to ensure existence and get context
    const lender = await db.lender.findUnique({
      where: { id: lenderId },
      include: {
        project: true,
        loans: true,
      },
    });

    if (!lender) {
      throw new Error('error.lender.notFound');
    }

    const loan = loanId ? lender.loans.find((l) => l.id === loanId) : undefined;
    if (loanId && !loan) {
      throw new Error('error.loan.notFound');
    }

    // Update the note
    const note = await db.note.update({
      where: { id: noteId },
      data: {
        text: data.text,
        public: data.public ?? false,
        loanId: loanId ?? null,
      },
    });

    // Create audit trail entry
    await createAuditEntry(db, {
      entity: Entity.note,
      operation: Operation.UPDATE,
      primaryKey: note.id,
      before: removeNullFields(existingNote),
      after: removeNullFields(note),
      context: {
        ...getLenderContext(lender),
        ...(loanId && loan && getLoanContext(loan)),
      },
      projectId: lender.projectId,
    });

    // Revalidate paths
    revalidatePath(`/${lender.projectId}/lenders/${lenderId}`);

    return { note };
  });
