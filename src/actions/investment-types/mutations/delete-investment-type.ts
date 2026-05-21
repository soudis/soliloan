'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAuditEntry, getInvestmentTypeContext, removeNullFields } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { projectAction } from '@/lib/utils/safe-action';

export const deleteInvestmentTypeAction = projectAction
  .inputSchema(z.object({ projectId: z.string(), investmentTypeId: z.string() }))
  .action(async ({ ctx, parsedInput }) => {
    const investmentType = await db.investmentType.findUnique({
      where: { id: parsedInput.investmentTypeId },
      include: { _count: { select: { loans: true } } },
    });

    if (!investmentType) {
      throw new Error('error.investmentType.notFound');
    }

    if (investmentType._count.loans > 0) {
      throw new Error('error.investmentType.cannotDeleteWithLoans');
    }

    await db.investmentType.delete({
      where: { id: parsedInput.investmentTypeId },
    });

    await createAuditEntry(db, {
      entity: Entity.investment_type,
      operation: Operation.DELETE,
      primaryKey: investmentType.id,
      before: removeNullFields(investmentType),
      after: {},
      context: getInvestmentTypeContext(investmentType),
      projectId: ctx.projectId,
    });

    revalidatePath('/investment-types');
    revalidatePath('/loans');

    return { success: true };
  });
