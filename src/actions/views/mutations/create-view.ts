'use server';

import type { ViewType } from '@prisma/client';
import { z } from 'zod';

import { db } from '@/lib/db';
import { viewFormSchema } from '@/lib/schemas/view';
import { authAction } from '@/lib/utils/safe-action';

export const createViewAction = authAction
  .schema(viewFormSchema.extend({ projectId: z.string().optional() }))
  .action(async ({ parsedInput: data, ctx }) => {
    if (data.isDefault) {
      await db.view.updateMany({
        where: {
          type: data.type as ViewType,
          userId: ctx.session.user.id,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Create the view
    const view = await db.view.create({
      data: {
        name: data.name,
        type: data.type as ViewType,
        data: data.data,
        isDefault: data.isDefault,
        user: {
          connect: {
            id: ctx.session.user.id,
          },
        },
      },
    });

    return { view };
  });
