'use server';

import type { ViewType } from '@prisma/client';
import { z } from 'zod';

import { db } from '@/lib/db';
import { viewFormSchema } from '@/lib/schemas/view';
import { authAction } from '@/lib/utils/safe-action';
import { assertCanManageProject } from '@/lib/views/access';

export const createViewAction = authAction
  .inputSchema(viewFormSchema.extend({ projectId: z.string().optional() }))
  .action(async ({ parsedInput: data, ctx }) => {
    const userId = ctx.session.user?.id;
    if (!userId) {
      throw new Error('error.unauthorized');
    }
    const isAdmin = ctx.session.user.isAdmin ?? false;

    if (data.projectId) {
      await assertCanManageProject(data.projectId, userId, isAdmin);
    }

    if (data.isDefault) {
      if (data.projectId) {
        await db.view.updateMany({
          where: {
            type: data.type as ViewType,
            projectId: data.projectId,
          },
          data: {
            isDefault: false,
          },
        });
      } else {
        await db.view.updateMany({
          where: {
            type: data.type as ViewType,
            userId,
            projectId: null,
          },
          data: {
            isDefault: false,
          },
        });
      }
    }

    const view = await db.view.create({
      data: {
        name: data.name,
        type: data.type as ViewType,
        data: data.data,
        isDefault: data.isDefault,
        showInSidebar: data.showInSidebar ?? false,
        user: {
          connect: { id: userId },
        },
        ...(data.projectId
          ? {
              project: {
                connect: { id: data.projectId },
              },
            }
          : {}),
      },
    });

    return { view };
  });
