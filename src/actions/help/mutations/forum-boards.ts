'use server';

import { z } from 'zod';

import { db } from '@/lib/db';
import { deleteUnusedFaqMedia } from '@/lib/help/delete-unused-faq-media';
import { assertUniqueForumBoardSlug, normalizeForumSlug } from '@/lib/help/ensure-forum-slug';
import {
  collectThreadMediaIds,
  deleteBoardCascade,
  filterValidModeratorIds,
  nextForumBoardPosition,
} from '@/lib/help/forum-db';
import { revalidateForumPaths } from '@/lib/help/revalidate-forum';
import { forumBoardFormSchema, forumBoardIdSchema, forumBoardReorderSchema } from '@/lib/schemas/forum';
import { adminAction } from '@/lib/utils/safe-action';

import { slugFieldError } from './slug-field-error';

export const createForumBoardAction = adminAction.inputSchema(forumBoardFormSchema).action(async ({ parsedInput }) => {
  const slug = normalizeForumSlug(parsedInput.slug);
  try {
    await assertUniqueForumBoardSlug(slug);
  } catch (error) {
    const fieldErrors = slugFieldError(error);
    if (fieldErrors) return fieldErrors;
    throw error;
  }

  const moderatorIds = await filterValidModeratorIds(parsedInput.moderatorIds);
  const board = await db.forumBoard.create({
    data: {
      name: parsedInput.name,
      slug,
      description: parsedInput.description,
      position: await nextForumBoardPosition(),
      moderators: {
        create: moderatorIds.map((userId) => ({ userId })),
      },
    },
    select: { id: true, slug: true },
  });

  revalidateForumPaths();
  return { board };
});

export const updateForumBoardAction = adminAction
  .inputSchema(forumBoardFormSchema.extend({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const existing = await db.forumBoard.findUnique({
      where: { id: parsedInput.id },
      select: { id: true },
    });
    if (!existing) {
      throw new Error('error.forum.boardNotFound');
    }

    const slug = normalizeForumSlug(parsedInput.slug);
    try {
      await assertUniqueForumBoardSlug(slug, existing.id);
    } catch (error) {
      const fieldErrors = slugFieldError(error);
      if (fieldErrors) return fieldErrors;
      throw error;
    }

    const moderatorIds = await filterValidModeratorIds(parsedInput.moderatorIds);
    await db.$transaction([
      db.forumBoard.update({
        where: { id: existing.id },
        data: {
          name: parsedInput.name,
          slug,
          description: parsedInput.description,
        },
      }),
      db.forumBoardModerator.deleteMany({ where: { boardId: existing.id } }),
      ...moderatorIds.map((userId) =>
        db.forumBoardModerator.create({
          data: { boardId: existing.id, userId },
        }),
      ),
    ]);

    revalidateForumPaths();
    return { board: { id: existing.id, slug } };
  });

export const deleteForumBoardAction = adminAction.inputSchema(forumBoardIdSchema).action(async ({ parsedInput }) => {
  const existing = await db.forumBoard.findUnique({
    where: { id: parsedInput.id },
    select: { id: true },
  });
  if (!existing) {
    throw new Error('error.forum.boardNotFound');
  }

  const threads = await db.forumThread.findMany({
    where: { boardId: existing.id },
    select: { id: true },
  });
  const mediaIds = [...new Set((await Promise.all(threads.map((thread) => collectThreadMediaIds(thread.id)))).flat())];

  await deleteBoardCascade(existing.id);
  await deleteUnusedFaqMedia(mediaIds);

  revalidateForumPaths();
  return { success: true };
});

export const reorderForumBoardsAction = adminAction
  .inputSchema(forumBoardReorderSchema)
  .action(async ({ parsedInput }) => {
    await db.$transaction(
      parsedInput.boardIds.map((id, position) =>
        db.forumBoard.update({
          where: { id },
          data: { position },
        }),
      ),
    );
    revalidateForumPaths();
    return { success: true };
  });
