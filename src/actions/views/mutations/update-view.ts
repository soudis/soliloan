'use server';

import type { ViewType } from '@prisma/client';
import { z } from 'zod';

import { db } from '@/lib/db';
import { viewFormUpdateSchema } from '@/lib/schemas/view';
import { authAction } from '@/lib/utils/safe-action';
import { assertCanModifyView } from '@/lib/views/access';

export const updateViewAction = authAction
  .schema(
    z.object({
      viewId: z.string(),
      projectId: z.string().optional(),
      data: viewFormUpdateSchema,
    }),
  )
  .action(async ({ parsedInput: { viewId, data }, ctx }) => {
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

    if (data.isDefault === true) {
      if (view.projectId) {
        await db.view.updateMany({
          where: {
            type: view.type,
            projectId: view.projectId,
          },
          data: { isDefault: false },
        });
      } else {
        await db.view.updateMany({
          where: {
            type: view.type,
            userId,
            projectId: null,
          },
          data: { isDefault: false },
        });
      }
    }

    const updatedView = await db.view.update({
      where: { id: viewId },
      data: {
        ...data,
        type: data.type as ViewType | undefined,
      },
    });

    return { view: updatedView };
  });
