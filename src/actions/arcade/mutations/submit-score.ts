'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { submitHighscoreSchema } from '@/lib/schemas/arcade';
import { managerAction } from '@/lib/utils/safe-action';

export const submitHighscoreAction = managerAction
  .inputSchema(submitHighscoreSchema)
  .action(async ({ parsedInput: data, ctx: { session } }) => {
    const userId = session.user.id;
    if (!userId) throw new Error('error.unauthorized');

    const entry = await db.highscoreEntry.create({
      data: {
        userId,
        pseudonym: data.pseudonym,
        comment: data.comment?.trim() || null,
        score: data.score,
        wave: data.wave,
        revealIdentity: data.revealIdentity,
      },
      select: { id: true },
    });

    revalidatePath('/procrastinator');

    return { id: entry.id };
  });
