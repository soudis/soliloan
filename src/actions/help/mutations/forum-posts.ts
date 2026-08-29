'use server';

import { z } from 'zod';

import { db } from '@/lib/db';
import { deleteUnusedFaqMedia } from '@/lib/help/delete-unused-faq-media';
import { FORUM_MAX_DEPTH } from '@/lib/help/forum-constants';
import {
  computePostDepth,
  deleteThreadCascade,
  getThreadWithMods,
  mediaIdsFromBody,
  prepareForumPostBody,
  refreshThreadActivity,
} from '@/lib/help/forum-db';
import { canDeletePost, canEditPost, forumUserFromSession } from '@/lib/help/forum-permissions';
import { revalidateForumPaths } from '@/lib/help/revalidate-forum';
import { forumPostCreateSchema, forumPostUpdateSchema, forumReactionSchema } from '@/lib/schemas/forum';
import { managerAction } from '@/lib/utils/safe-action';

function sessionUser(ctx: { session: { user: { id?: string | null; isAdmin?: boolean | null } } }) {
  return forumUserFromSession(ctx.session.user);
}

export const createForumPostAction = managerAction
  .inputSchema(forumPostCreateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const user = sessionUser(ctx);
    const { thread } = await getThreadWithMods(parsedInput.threadId);
    if (thread.locked) {
      throw new Error('error.forum.threadLocked');
    }

    const parent = await db.forumPost.findUnique({
      where: { id: parsedInput.parentId },
      select: { id: true, threadId: true, parentId: true },
    });
    if (!parent || parent.threadId !== thread.id) {
      throw new Error('error.forum.postNotFound');
    }

    const parentDepth = await computePostDepth(parent.id);
    const parentId = parentDepth >= FORUM_MAX_DEPTH ? (parent.parentId ?? parent.id) : parent.id;
    const prepared = prepareForumPostBody(parsedInput.body);

    const post = await db.forumPost.create({
      data: {
        threadId: thread.id,
        authorId: user.id,
        parentId,
        body: prepared.body,
        searchText: prepared.searchText,
      },
      select: { id: true },
    });

    await db.forumThread.update({
      where: { id: thread.id },
      data: {
        lastPostedAt: new Date(),
        replyCount: { increment: 1 },
      },
    });

    revalidateForumPaths();
    return { post };
  });

export const updateForumPostAction = managerAction
  .inputSchema(forumPostUpdateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const existing = await db.forumPost.findUnique({
      where: { id: parsedInput.id },
      select: { id: true, authorId: true, body: true, threadId: true },
    });
    if (!existing) {
      throw new Error('error.forum.postNotFound');
    }
    if (!canEditPost(sessionUser(ctx), existing.authorId)) {
      throw new Error('error.unauthorized');
    }

    const prepared = prepareForumPostBody(parsedInput.body);
    const previousMediaIds = mediaIdsFromBody(existing.body);
    const nextMedia = new Set(mediaIdsFromBody(prepared.json));
    const removedMediaIds = previousMediaIds.filter((id) => !nextMedia.has(id));

    await db.forumPost.update({
      where: { id: existing.id },
      data: {
        body: prepared.body,
        searchText: prepared.searchText,
        editedAt: new Date(),
      },
    });

    if (removedMediaIds.length > 0) {
      await deleteUnusedFaqMedia(removedMediaIds);
    }

    revalidateForumPaths();
    return { success: true };
  });

export const deleteForumPostAction = managerAction
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput, ctx }) => {
    const existing = await db.forumPost.findUnique({
      where: { id: parsedInput.id },
      include: {
        replies: { select: { id: true } },
        thread: {
          select: {
            id: true,
            authorId: true,
            board: { select: { slug: true, moderators: { select: { userId: true } } } },
          },
        },
      },
    });
    if (!existing) {
      throw new Error('error.forum.postNotFound');
    }

    const moderatorIds = existing.thread.board.moderators.map((mod) => mod.userId);
    const hasReplies = existing.replies.length > 0;
    if (!canDeletePost(sessionUser(ctx), existing.authorId, hasReplies, moderatorIds)) {
      throw new Error(hasReplies ? 'error.forum.postHasReplies' : 'error.unauthorized');
    }

    const mediaIds = mediaIdsFromBody(existing.body);
    const isOriginal = existing.parentId === null;
    const boardSlug = existing.thread.board.slug;

    if (isOriginal) {
      await deleteThreadCascade(existing.thread.id);
      await deleteUnusedFaqMedia(mediaIds);
      revalidateForumPaths();
      return { deletedThread: true, boardSlug };
    }

    await db.forumPost.delete({ where: { id: existing.id } });
    await refreshThreadActivity(existing.thread.id);
    await deleteUnusedFaqMedia(mediaIds);

    revalidateForumPaths();
    return { deletedThread: false, boardSlug };
  });

export const toggleForumReactionAction = managerAction
  .inputSchema(forumReactionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const post = await db.forumPost.findUnique({
      where: { id: parsedInput.postId },
      select: { id: true },
    });
    if (!post) {
      throw new Error('error.forum.postNotFound');
    }

    const userId = sessionUser(ctx).id;
    const existing = await db.forumPostReaction.findUnique({
      where: { postId_userId: { postId: post.id, userId } },
    });

    if (existing?.emoji === parsedInput.emoji) {
      await db.forumPostReaction.delete({ where: { id: existing.id } });
    } else if (existing) {
      await db.forumPostReaction.update({
        where: { id: existing.id },
        data: { emoji: parsedInput.emoji },
      });
    } else {
      await db.forumPostReaction.create({
        data: {
          postId: post.id,
          userId,
          emoji: parsedInput.emoji,
        },
      });
    }

    revalidateForumPaths();
    return { success: true };
  });
