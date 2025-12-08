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
import { fileAction } from '@/lib/utils/safe-action';

export const deleteFileAction = fileAction
  .schema(z.object({ fileId: z.string() }))
  .action(async ({ parsedInput: { fileId }, ctx }) => {
    // Fetch file with lender/loan info
    const file = await db.file.findUnique({
      where: { id: fileId },
      include: {
        lender: true,
        loan: true,
      },
    });

    if (!file) {
      throw new Error('File not found');
    }

    // Create audit trail entry
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
        ...getLenderContext(file.lender),
        ...(file.loan && getLoanContext(file.loan)),
        ...getFileContext(file),
      },
      projectId: file.lender.projectId,
    });

    // Delete the file
    await db.file.delete({
      where: {
        id: fileId,
      },
    });

    // Revalidate paths
    revalidatePath(`/lenders/${file.lenderId}`);
    if (file.loanId) {
      revalidatePath(`/loans/${file.loanId}`);
    }

    return { success: true };
  });
