'use server';

import { z } from 'zod';

import { db } from '@/lib/db';
import { authAction } from '@/lib/utils/safe-action';
import { assertCanModifyView } from '@/lib/views/access';

export const deleteViewAction = authAction
  .schema(z.object({ viewId: z.string(), projectId: z.string().optional() }))
  .action(async ({ parsedInput: { viewId }, ctx }) => {
    const userId = ctx.session.user?.id;
    if (!userId) {
      throw new Error('error.unauthorized');
    }
    const isAdmin = ctx.session.user.isAdmin ?? false;

    const view = await db.view.findUnique({
      where: { id: viewId },
    });

    if (!view) {
      throw new Error('View not found');
    }

    await assertCanModifyView(view, userId, isAdmin);

    await db.view.delete({
      where: { id: viewId },
    });

    return { success: true };
  });
