'use server';

import type { ViewType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { db } from '@/lib/db';
import { viewFormSchema } from '@/lib/schemas/view';
import { authAction } from '@/lib/utils/safe-action';

export const updateViewAction = authAction
  .schema(
    z.object({
      viewId: z.string(),
      projectId: z.string().optional(),
      data: viewFormSchema.partial(),
    }),
  )
  .action(async ({ parsedInput: { viewId, projectId, data }, ctx }) => {
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

    if (data.isDefault) {
      await db.view.updateMany({
        where: {
          type: view.type,
          userId: ctx.session.user.id, // Ensure we only update this user's views
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Update the view
    const updatedView = await db.view.update({
      where: {
        id: viewId,
      },
      data: {
        ...data,
        type: data.type as ViewType | undefined,
      },
    });

    // Revalidate the view
    const typePath = view.type.toLowerCase();
    if (projectId) {
      revalidatePath(`/${projectId}/${typePath}`);
    }

    return { view: updatedView };
  });
