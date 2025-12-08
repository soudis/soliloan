'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  createAuditEntry,
  getFileContext,
  getLenderContext,
  getLoanContext,
  removeNullFields,
} from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { noteSchema } from '@/lib/schemas/note';
import { lenderAction } from '@/lib/utils/safe-action';

export const createNoteAction = lenderAction
  .inputSchema(
    z.object({
      lenderId: z.string(),
      loanId: z.string().optional(),
      data: noteSchema,
    }),
  )
  .action(async ({ parsedInput: { lenderId, loanId, data }, ctx }) => {
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

    // Create the note
    const note = await db.note.create({
      data: {
        text: data.text,
        public: data.public ?? false,
        ...(loanId
          ? {
              loan: {
                connect: {
                  id: loanId,
                },
              },
            }
          : {}),
        lender: {
          connect: {
            id: lenderId,
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
      entity: Entity.note,
      operation: Operation.CREATE,
      primaryKey: note.id,
      before: {},
      after: removeNullFields(note),
      context: {
        ...getLenderContext(lender),
        ...(loanId && loan && getLoanContext(loan)),
      },
      projectId: lender.projectId,
    });

    // Revalidate paths
    if (loanId) {
      revalidatePath(`/loans/${loanId}`);
    }
    revalidatePath(`/lenders/${lenderId}`);

    return { note };
  });
