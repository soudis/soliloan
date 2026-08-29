import type { Prisma } from '@prisma/client';
import type { JSONContent } from '@tiptap/core';

import { db } from '@/lib/db';
import { extractFaqMediaIds, extractFaqSearchText, isEmptyRichText, sanitizeForumBody } from '@/lib/help/faq-body';

export async function nextForumBoardPosition(): Promise<number> {
  const aggregate = await db.forumBoard.aggregate({
    _max: { position: true },
  });
  return (aggregate._max.position ?? -1) + 1;
}

export async function getBoardModeratorIds(boardId: string): Promise<string[]> {
  const rows = await db.forumBoardModerator.findMany({
    where: { boardId },
    select: { userId: true },
  });
  return rows.map((row) => row.userId);
}

export async function findManagerUsers() {
  return db.user.findMany({
    where: {
      OR: [{ isAdmin: true }, { managerOf: { some: {} } }],
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
}

export async function filterValidModeratorIds(ids: string[]): Promise<string[]> {
  const managers = await findManagerUsers();
  const allowed = new Set(managers.map((user) => user.id));
  return [...new Set(ids)].filter((id) => allowed.has(id));
}

export function prepareForumPostBody(input: unknown) {
  const json = sanitizeForumBody(input);
  if (isEmptyRichText(json)) {
    throw new Error('error.forum.emptyBody');
  }
  return {
    json,
    body: json as Prisma.InputJsonValue,
    searchText: extractFaqSearchText(json),
  };
}

export function mediaIdsFromBody(body: unknown): string[] {
  return extractFaqMediaIds(sanitizeForumBody(body as JSONContent));
}

export async function collectThreadMediaIds(threadId: string): Promise<string[]> {
  const posts = await db.forumPost.findMany({
    where: { threadId },
    select: { body: true },
  });
  return [...new Set(posts.flatMap((post) => mediaIdsFromBody(post.body)))];
}

export async function getThreadWithMods(threadId: string) {
  const thread = await db.forumThread.findUnique({
    where: { id: threadId },
    include: {
      board: {
        select: {
          id: true,
          slug: true,
          name: true,
          moderators: { select: { userId: true } },
        },
      },
    },
  });
  if (!thread) {
    throw new Error('error.forum.threadNotFound');
  }
  return {
    thread,
    moderatorIds: thread.board.moderators.map((mod) => mod.userId),
  };
}

export async function deleteThreadPosts(threadId: string) {
  await db.forumPostReaction.deleteMany({ where: { post: { threadId } } });
  for (;;) {
    const result = await db.forumPost.deleteMany({
      where: { threadId, replies: { none: {} } },
    });
    if (result.count === 0) break;
  }
}

export async function deleteThreadCascade(threadId: string) {
  await deleteThreadPosts(threadId);
  await db.forumThread.delete({ where: { id: threadId } });
}

export async function deleteBoardCascade(boardId: string) {
  const threads = await db.forumThread.findMany({
    where: { boardId },
    select: { id: true },
  });
  for (const thread of threads) {
    await deleteThreadPosts(thread.id);
  }
  await db.forumBoard.delete({ where: { id: boardId } });
}

export async function refreshThreadActivity(threadId: string) {
  const [aggregate, replyCount] = await Promise.all([
    db.forumPost.aggregate({
      where: { threadId },
      _max: { createdAt: true },
    }),
    db.forumPost.count({
      where: { threadId, parentId: { not: null } },
    }),
  ]);
  await db.forumThread.update({
    where: { id: threadId },
    data: {
      lastPostedAt: aggregate._max.createdAt ?? new Date(),
      replyCount,
    },
  });
}

export async function computePostDepth(postId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = postId;
  const seen = new Set<string>();
  while (currentId) {
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const post: { parentId: string | null } | null = await db.forumPost.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });
    if (!post?.parentId) break;
    depth += 1;
    currentId = post.parentId;
  }
  return depth;
}
