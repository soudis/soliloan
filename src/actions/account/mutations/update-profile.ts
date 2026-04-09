'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { updateProfileSchema } from '@/lib/schemas/account';
import { authAction } from '@/lib/utils/safe-action';

export const updateProfileAction = authAction
  .inputSchema(updateProfileSchema)
  .action(async ({ parsedInput: { name, language }, ctx: { session } }) => {
    await db.user.update({
      where: { id: session.user.id },
      data: { name, language },
    });

    revalidatePath('/account');

    return { success: true };
  });
