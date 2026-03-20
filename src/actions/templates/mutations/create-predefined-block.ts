'use server';

import { db } from '@/lib/db';
import { createPredefinedBlockSchema } from '@/lib/schemas/templates';
import { authAction } from '@/lib/utils/safe-action';

export const createPredefinedBlockAction = authAction
  .inputSchema(createPredefinedBlockSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    const isGlobal = !data.projectId;

    if (isGlobal) {
      if (!ctx.session.user.isAdmin) {
        throw new Error('error.unauthorized');
      }
    } else {
      if (!ctx.session.user.isAdmin) {
        const project = await db.project.count({
          where: { id: data.projectId as string, managers: { some: { id: ctx.session.user.id } } },
        });
        if (project === 0) {
          throw new Error('error.project.notFound');
        }
      }
      // Non-admin project blocks are always PROJECT_MANAGERS visibility
      if (!ctx.session.user.isAdmin) {
        data.visibility = 'PROJECT_MANAGERS';
      }
    }

    const block = await db.predefinedCraftBlock.create({
      data: {
        name: data.name,
        description: data.description,
        designJson: data.designJson,
        datasets: data.datasets,
        visibility: data.visibility,
        project: data.projectId ? { connect: { id: data.projectId } } : undefined,
        createdBy: { connect: { id: ctx.session.user.id } },
      },
    });

    return { id: block.id };
  });
