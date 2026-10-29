'use server';

import { TemplateDataset, TemplateType } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getMergeTagConfigUnsafe } from '@/lib/templates/merge-tag-config';
import { managerAction } from '@/lib/utils/safe-action';

export const getMergeTagConfigAction = managerAction
  .inputSchema(
    z.object({
      dataset: z.enum(TemplateDataset),
      projectId: z.string().optional(),
      templateType: z.enum(TemplateType).optional(),
    }),
  )
  .action(async ({ parsedInput: { dataset, projectId, templateType }, ctx }) => {
    if (projectId && !ctx.session.user.isAdmin) {
      const managed = await db.project.count({
        where: { id: projectId, managers: { some: { id: ctx.session.user.id } } },
      });
      if (managed === 0) {
        throw new Error('error.project.notFound');
      }
    }

    return getMergeTagConfigUnsafe(dataset, projectId, templateType);
  });
