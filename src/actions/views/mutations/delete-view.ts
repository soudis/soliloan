'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { db } from '@/lib/db';
import { authAction } from '@/lib/utils/safe-action';

export const deleteViewAction = authAction
  .schema(z.object({ viewId: z.string() }))
  .action(async ({ parsedInput: { viewId }, ctx }) => {
    // Fetch the view
    const view = await db.view.findUnique({
      where: {
        id: viewId,
      },
    });

    if (!view) {
      throw new Error('View not found');
    }

    // Check if the user has access to the view
    if (view.userId !== ctx.session.user.id) {
      throw new Error('error.unauthorized');
    }

    // Delete the view
    await db.view.delete({
      where: {
        id: viewId,
      },
    });

    // Revalidate the view
    revalidatePath(`/${view.type.toLowerCase()}`);

    return { success: true };
  });
