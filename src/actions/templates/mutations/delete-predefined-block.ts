'use server';

import { db } from '@/lib/db';
import { deletePredefinedBlockSchema } from '@/lib/schemas/templates';
import { authAction } from '@/lib/utils/safe-action';

export const deletePredefinedBlockAction = authAction
  .inputSchema(deletePredefinedBlockSchema)
  .action(async ({ parsedInput: { id }, ctx }) => {
    const block = await db.predefinedCraftBlock.findUnique({
      where: { id },
      select: { projectId: true, createdById: true },
    });

    if (!block) {
      throw new Error('error.predefinedBlock.notFound');
    }

    // Admins can delete any block; non-admins only their own project blocks
    if (!ctx.session.user.isAdmin) {
      if (!block.projectId) {
        throw new Error('error.unauthorized');
      }
      const project = await db.project.count({
        where: { id: block.projectId, managers: { some: { id: ctx.session.user.id } } },
      });
      if (project === 0) {
        throw new Error('error.unauthorized');
      }
    }

    await db.predefinedCraftBlock.delete({ where: { id } });

    return { success: true };
  });
