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
import { createThumbnail } from '@/lib/utils/file';
import { lenderAction } from '@/lib/utils/safe-action';

export const addFileAction = lenderAction
  .inputSchema(
    z.object({
      lenderId: z.string(),
      loanId: z.string().optional(),
      data: fileSchema, // Fixed import
      base64Data: z.string(),
      mimeType: z.string(),
    }),
  )
  .action(async ({ parsedInput: { lenderId, loanId, data, base64Data, mimeType }, ctx }) => {
    // Fetch lender to ensure existence and get context
    // Casting to LenderWithRelations or verifying fields
    const lender = await db.lender.findUnique({
      where: { id: lenderId },
      include: {
        project: true,
        loans: true,
      },
    });

    if (!lender) {
      throw new Error('Lender not found');
    }

    const loan = loanId ? lender.loans.find((l) => l.id === loanId) : undefined;
    if (loanId && !loan) {
      throw new Error('Loan not found');
    }

    // Convert base64 back to Uint8Array
    const binaryData = Buffer.from(base64Data, 'base64');

    const thumbnailData = await createThumbnail(binaryData, mimeType);

    // Create the file
    const file = await db.file.create({
      data: {
        name: data.name,
        mimeType,
        data: new Uint8Array(binaryData),
        thumbnail: thumbnailData,
        public: data.public ?? false,
        description: data.description,
        // Fix conditional connect syntax
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
      },
    });

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
      operation: Operation.CREATE,
      primaryKey: file.id,
      before: {},
      after: removeNullFields(fileForAudit),
      context: {
        ...getLenderContext(lender), // Cast to handle complex includes
        ...(loanId && loan && getLoanContext(loan)),
        ...getFileContext(file),
      },
      projectId: lender.projectId,
    });

    // Revalidate paths
    if (loanId) {
      revalidatePath('/lenders');
    }
    revalidatePath(`/lenders/${lenderId}`);

    return { fileId: file.id };
  });
