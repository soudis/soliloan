'use server';

import type { ViewType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { viewFormSchema } from '@/lib/schemas/view';
import { authAction } from '@/lib/utils/safe-action';

export const createViewAction = authAction.schema(viewFormSchema).action(async ({ parsedInput: data, ctx }) => {
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
  revalidatePath(`/${view.type.toLowerCase()}`);

  return { view };
});
