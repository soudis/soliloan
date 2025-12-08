'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { createAuditEntry, getLenderContext, removeNullFields } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { lenderIdSchema } from '@/lib/schemas/common';
import { lenderAction } from '@/lib/utils/safe-action';

export const deleteLenderAction = lenderAction.schema(lenderIdSchema).action(async ({ parsedInput: { lenderId } }) => {
  // Fetch the lender
  const lender = await db.lender.findUnique({
    where: { id: lenderId },
    include: {
      project: {
        select: { id: true, configuration: true },
      },
    },
  });

  if (!lender) {
    throw new Error('Lender not found');
  }

  // Create audit trail entry before deletion
  await createAuditEntry(db, {
    entity: Entity.lender,
    operation: Operation.DELETE,
    primaryKey: lenderId,
    before: removeNullFields(lender),
    after: {},
    context: getLenderContext(lender),
    projectId: lender.projectId,
  });

  // Delete the lender
  await db.lender.delete({
    where: {
      id: lenderId,
    },
  });

  // Revalidate the project lenders page
  revalidatePath(`/${lender.projectId}/lenders`);

  return { success: true };
});
