'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createAuditEntry, getLenderContext, removeNullFields } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { projectAction } from '@/lib/utils/safe-action';

const bulkDeleteLendersSchema = z.object({
  projectId: z.string(),
  lenderIds: z.array(z.string().min(1)).min(1),
});

export const bulkDeleteLendersAction = projectAction
  .schema(bulkDeleteLendersSchema)
  .action(async ({ parsedInput: { lenderIds, projectId } }) => {
    // Fetch all lenders to verify they belong to this project and for audit trail
    const lenders = await db.lender.findMany({
      where: {
        id: { in: lenderIds },
        projectId,
      },
      include: {
        project: {
          select: { id: true, configuration: true },
        },
      },
    });

    if (lenders.length === 0) {
      throw new Error('error.lender.notFound');
    }

    // Create audit trail entries before deletion
    for (const lender of lenders) {
      await createAuditEntry(db, {
        entity: Entity.lender,
        operation: Operation.DELETE,
        primaryKey: lender.id,
        before: removeNullFields(lender),
        after: {},
        context: getLenderContext(lender),
        projectId: lender.projectId,
      });
    }

    // Delete all lenders
    await db.lender.deleteMany({
      where: {
        id: { in: lenders.map((l) => l.id) },
        projectId,
      },
    });

    // Revalidate the project lenders page
    revalidatePath(`/${projectId}/lenders`);

    return { success: true, deletedCount: lenders.length };
  });
