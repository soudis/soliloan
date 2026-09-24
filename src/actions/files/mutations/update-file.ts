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
import { fileSchema } from '@/lib/schemas/file';
import { fileAction } from '@/lib/utils/safe-action';

function fileAuditFields(file: {
  id: string;
  name: string;
  mimeType: string;
  public: boolean;
  description: string | null;
  lenderId: string;
  loanId: string | null;
}) {
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    public: file.public,
    description: file.description,
    lenderId: file.lenderId,
    loanId: file.loanId,
  };
}

export const updateFileAction = fileAction
  .inputSchema(
    z.object({
      fileId: z.string(),
      data: fileSchema,
    }),
  )
  .action(async ({ parsedInput: { fileId, data } }) => {
    const existing = await db.file.findUnique({
      where: { id: fileId },
      include: {
        lender: true,
        loan: true,
      },
    });

    if (!existing) {
      throw new Error('error.file.notFound');
    }

    const loanId = data.loanId || null;
    const loan = loanId
      ? await db.loan.findFirst({
          where: { id: loanId, lenderId: existing.lenderId },
        })
      : null;

    if (loanId && !loan) {
      throw new Error('error.loan.notFound');
    }

    const file = await db.file.update({
      where: { id: fileId },
      data: {
        name: data.name,
        description: data.description || null,
        public: data.public ?? false,
        loanId,
      },
    });

    const contextLoan = loan ?? existing.loan;

    await createAuditEntry(db, {
      entity: Entity.file,
      operation: Operation.UPDATE,
      primaryKey: file.id,
      before: removeNullFields(fileAuditFields(existing)),
      after: removeNullFields(fileAuditFields(file)),
      context: {
        ...getLenderContext(existing.lender),
        ...(contextLoan && getLoanContext(contextLoan)),
        ...getFileContext(file),
      },
      projectId: existing.lender.projectId,
    });

    revalidatePath(`/lenders/${existing.lenderId}`);

    return { fileId: file.id };
  });
