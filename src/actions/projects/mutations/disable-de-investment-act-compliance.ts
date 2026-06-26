'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAuditEntry, getChangedFields } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { projectAction } from '@/lib/utils/safe-action';

export const disableDeInvestmentActComplianceAction = projectAction
  .inputSchema(z.object({ projectId: z.string() }))
  .action(async ({ ctx }) => {
    const project = await db.project.findUniqueOrThrow({
      where: { id: ctx.projectId },
      select: {
        configurationId: true,
        configuration: { select: { deInvestmentActCompliance: true } },
      },
    });

    if (!project.configuration.deInvestmentActCompliance) {
      return { success: true as const };
    }

    const configuration = await db.configuration.update({
      where: { id: project.configurationId },
      data: { deInvestmentActCompliance: false },
    });

    const { before, after } = getChangedFields(
      { deInvestmentActCompliance: true },
      { deInvestmentActCompliance: configuration.deInvestmentActCompliance },
    );
    if (Object.keys(before).length > 0) {
      await createAuditEntry(db, {
        entity: Entity.project,
        operation: Operation.UPDATE,
        primaryKey: configuration.id,
        before,
        after,
        context: {},
        projectId: ctx.projectId,
      });
    }

    revalidatePath('/configuration');
    revalidatePath('/loans');
    revalidatePath('/investment-types');

    return { success: true as const };
  });
