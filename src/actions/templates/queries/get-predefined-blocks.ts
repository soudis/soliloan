'use server';

import type { Prisma, TemplateDataset } from '@prisma/client';
import { db } from '@/lib/db';
import { listPredefinedBlocksSchema } from '@/lib/schemas/templates';
import { authAction } from '@/lib/utils/safe-action';

export const getPredefinedBlocksAction = authAction
  .inputSchema(listPredefinedBlocksSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    const where: Prisma.PredefinedCraftBlockWhereInput = {
      datasets: { has: data.dataset as TemplateDataset },
    };

    // Scope: global blocks + project-specific blocks for the given project
    if (data.projectId) {
      where.OR = [{ projectId: null }, { projectId: data.projectId }];
    } else {
      where.projectId = null;
    }

    // Non-admins only see PROJECT_MANAGERS blocks
    if (!ctx.session.user.isAdmin) {
      where.visibility = 'PROJECT_MANAGERS';
    }

    const blocks = await db.predefinedCraftBlock.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        designJson: true,
        datasets: true,
        visibility: true,
        projectId: true,
      },
      orderBy: [{ projectId: 'asc' }, { name: 'asc' }],
    });

    return { blocks };
  });
