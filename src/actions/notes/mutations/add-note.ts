'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createAuditEntry, getLenderContext, getLoanContext, removeNullFields } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { noteSchema } from '@/lib/schemas/note';
import { loanAction } from '@/lib/utils/safe-action';

export const addNoteAction = loanAction
  .inputSchema(
    z.object({
      loanId: z.string(),
      data: noteSchema, // Fixed import
    }),
  )
  .action(async ({ parsedInput: { loanId, data }, ctx }) => {
    // Fetch the loan with lender info for context
    const loan = await db.loan.findUnique({
      where: {
        id: loanId,
      },
      include: {
        lender: true, // Need projectId for audit
      },
    });

    if (!loan) {
      throw new Error('error.loan.notFound');
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
            id: ctx.session.user.id,
          },
        },
        createdAt: new Date(),
      },
    });

    // Create audit trail entry
    await createAuditEntry(db, {
      entity: 'note',
      operation: 'CREATE',
      primaryKey: note.id,
      before: {},
      after: removeNullFields(note),
      context: {
        ...getLenderContext(loan.lender),
        ...getLoanContext(loan),
      },
      projectId: loan.lender.projectId,
    });

    // Revalidate the loan page
    revalidatePath(`/loans/${loanId}`);

    return { note };
  });
