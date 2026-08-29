'use server';

import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { db } from '@/lib/db';
import { deleteUnusedFaqMedia } from '@/lib/help/delete-unused-faq-media';
import {
  collectThreadMediaIds,
  deleteThreadCascade,
  getThreadWithMods,
  prepareForumPostBody,
} from '@/lib/help/forum-db';
import { canDeleteThread, canModerateBoard, canRenameThread, forumUserFromSession } from '@/lib/help/forum-permissions';
import { revalidateForumPaths } from '@/lib/help/revalidate-forum';
import {
  forumBoardIdSchema,
  forumThreadCreateSchema,
  forumThreadFlagsSchema,
  forumThreadMoveSchema,
  forumThreadRenameSchema,
} from '@/lib/schemas/forum';
import { managerAction } from '@/lib/utils/safe-action';

function sessionUser(ctx: { session: { user: { id?: string | null; isAdmin?: boolean | null } } }) {
  return forumUserFromSession(ctx.session.user);
}

export const createForumThreadAction = managerAction
  .inputSchema(forumThreadCreateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const board = await db.forumBoard.findUnique({
      where: { id: parsedInput.boardId },
      select: { id: true, slug: true },
    });
    if (!board) {
      throw new Error('error.forum.boardNotFound');
    }

    const user = sessionUser(ctx);
    const prepared = prepareForumPostBody(parsedInput.body);
    const thread = await db.$transaction(async (tx) => {
      const created = await tx.forumThread.create({
        data: {
          title: parsedInput.title,
          boardId: board.id,
          authorId: user.id,
        },
        select: { id: true },
      });
      await tx.forumPost.create({
        data: {
          threadId: created.id,
          authorId: user.id,
          body: prepared.body,
          searchText: prepared.searchText,
        },
      });
      return created;
    });

    revalidateForumPaths();
    return { thread: { id: thread.id, boardSlug: board.slug } };
  });

export const renameForumThreadAction = managerAction
  .inputSchema(forumThreadRenameSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { thread, moderatorIds } = await getThreadWithMods(parsedInput.id);
    if (!canRenameThread(sessionUser(ctx), thread.authorId, moderatorIds)) {
      throw new Error('error.unauthorized');
    }

    await db.forumThread.update({
      where: { id: thread.id },
      data: { title: parsedInput.title },
    });

    revalidateForumPaths();
    return { success: true };
  });

export const moveForumThreadAction = managerAction
  .inputSchema(forumThreadMoveSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { thread, moderatorIds } = await getThreadWithMods(parsedInput.id);
    if (!canModerateBoard(sessionUser(ctx), moderatorIds)) {
      throw new Error('error.unauthorized');
    }

    const board = await db.forumBoard.findUnique({
      where: { id: parsedInput.boardId },
      select: { id: true, slug: true },
    });
    if (!board) {
      throw new Error('error.forum.boardNotFound');
    }

    await db.forumThread.update({
      where: { id: thread.id },
      data: { boardId: board.id },
    });

    revalidateForumPaths();
    return { boardSlug: board.slug };
  });

export const updateForumThreadFlagsAction = managerAction
  .inputSchema(forumThreadFlagsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { thread, moderatorIds } = await getThreadWithMods(parsedInput.id);
    if (!canModerateBoard(sessionUser(ctx), moderatorIds)) {
      throw new Error('error.unauthorized');
    }

    const data: Prisma.ForumThreadUpdateInput = {};
    if (parsedInput.pinned !== undefined) data.pinned = parsedInput.pinned;
    if (parsedInput.locked !== undefined) data.locked = parsedInput.locked;

    await db.forumThread.update({
      where: { id: thread.id },
      data,
    });

    revalidateForumPaths();
    return { success: true };
  });

export const deleteForumThreadAction = managerAction
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const { thread, moderatorIds } = await getThreadWithMods(parsedInput.id);
    if (!canDeleteThread(sessionUser(ctx), thread.authorId, thread.replyCount, moderatorIds)) {
      throw new Error('error.unauthorized');
    }

    const mediaIds = await collectThreadMediaIds(thread.id);
    const boardSlug = thread.board.slug;
    await deleteThreadCascade(thread.id);
    await deleteUnusedFaqMedia(mediaIds);

    revalidateForumPaths();
    return { boardSlug };
  });

export const markForumBoardReadAction = managerAction
  .inputSchema(forumBoardIdSchema)
  .action(async ({ parsedInput, ctx }) => {
    const board = await db.forumBoard.findUnique({
      where: { id: parsedInput.id },
      select: { id: true },
    });
    if (!board) {
      throw new Error('error.forum.boardNotFound');
    }

    const userId = sessionUser(ctx).id;
    const threads = await db.forumThread.findMany({
      where: { boardId: board.id },
      select: { id: true },
    });
    const now = new Date();
    await db.$transaction(
      threads.map((thread) =>
        db.forumThreadRead.upsert({
          where: { threadId_userId: { threadId: thread.id, userId } },
          create: { threadId: thread.id, userId, lastReadAt: now },
          update: { lastReadAt: now },
        }),
      ),
    );

    revalidateForumPaths();
    return { success: true };
  });
