'use server';

import type { ViewType } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { db } from '@/lib/db';
import { viewFormSchema } from '@/lib/schemas/view';
import { authAction } from '@/lib/utils/safe-action';

export const createViewAction = authAction
  .schema(viewFormSchema.extend({ projectId: z.string().optional() }))
  .action(async ({ parsedInput: data, ctx }) => {
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

    // Revalidate the view
    const typePath = view.type.toLowerCase();
    if (data.projectId) {
      revalidatePath(`/${data.projectId}/${typePath}`);
    }

    return { view };
  });
