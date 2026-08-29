import { cache } from 'react';

import { db } from '@/lib/db';
import { FORUM_EMOJIS, FORUM_PAGE_SIZE } from '@/lib/help/forum-constants';
import {
  canDeletePost,
  canDeleteThread,
  canEditPost,
  canModerateBoard,
  canRenameThread,
} from '@/lib/help/forum-permissions';
import type {
  ForumBoardListItem,
  ForumBoardRecord,
  ForumPostNode,
  ForumPostReactionSummary,
  ForumThreadListItem,
  ForumThreadRecord,
} from '@/types/forum';

const authorSelect = { id: true, name: true } as const;
const reactionSelect = {
  emoji: true,
  userId: true,
  user: { select: { name: true } },
} as const;

function emptyReaction(emoji: string): ForumPostReactionSummary {
  return { emoji, count: 0, reacted: false, names: [] };
}

export const findForumBoards = cache(async (userId: string): Promise<ForumBoardListItem[]> => {
  const [boards, reads] = await Promise.all([
    db.forumBoard.findMany({
      orderBy: { position: 'asc' },
      include: {
        moderators: { include: { user: { select: { name: true } } } },
        threads: {
          select: { id: true, title: true, lastPostedAt: true },
          orderBy: { lastPostedAt: 'desc' },
        },
      },
    }),
    db.forumThreadRead.findMany({
      where: { userId },
      select: { threadId: true, lastReadAt: true },
    }),
  ]);

  const readMap = new Map(reads.map((row) => [row.threadId, row.lastReadAt]));

  return boards.map((board) => {
    const lastThread = board.threads[0] ?? null;
    const unreadCount = board.threads.filter((thread) => {
      const lastRead = readMap.get(thread.id);
      return !lastRead || thread.lastPostedAt > lastRead;
    }).length;

    return {
      id: board.id,
      name: board.name,
      slug: board.slug,
      description: board.description,
      position: board.position,
      threadCount: board.threads.length,
      unreadCount,
      lastPostedAt: lastThread?.lastPostedAt ?? null,
      lastThreadTitle: lastThread?.title ?? null,
      moderatorNames: board.moderators.map((mod) => mod.user.name),
      moderatorIds: board.moderators.map((mod) => mod.userId),
    };
  });
});

export const findForumBoardBySlug = cache(async (slug: string): Promise<ForumBoardRecord | null> => {
  const board = await db.forumBoard.findUnique({
    where: { slug },
    include: {
      moderators: { include: { user: { select: authorSelect } } },
    },
  });
  if (!board) return null;
  return {
    id: board.id,
    name: board.name,
    slug: board.slug,
    description: board.description,
    position: board.position,
    moderatorIds: board.moderators.map((mod) => mod.userId),
    moderators: board.moderators.map((mod) => mod.user),
  };
});

export async function findForumThreads(
  boardId: string,
  userId: string,
  options: { query: string; page: number },
): Promise<{ threads: ForumThreadListItem[]; total: number }> {
  const page = Math.max(1, options.page);
  const query = options.query.trim();
  const where = {
    boardId,
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: 'insensitive' as const } },
            { posts: { some: { searchText: { contains: query, mode: 'insensitive' as const } } } },
          ],
        }
      : {}),
  };

  const [total, threads, reads] = await Promise.all([
    db.forumThread.count({ where }),
    db.forumThread.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { lastPostedAt: 'desc' }],
      skip: (page - 1) * FORUM_PAGE_SIZE,
      take: FORUM_PAGE_SIZE,
      include: { author: { select: authorSelect } },
    }),
    db.forumThreadRead.findMany({
      where: { userId, thread: { boardId } },
      select: { threadId: true, lastReadAt: true },
    }),
  ]);

  const readMap = new Map(reads.map((row) => [row.threadId, row.lastReadAt]));

  return {
    total,
    threads: threads.map((thread) => {
      const lastRead = readMap.get(thread.id);
      return {
        id: thread.id,
        title: thread.title,
        pinned: thread.pinned,
        locked: thread.locked,
        replyCount: thread.replyCount,
        lastPostedAt: thread.lastPostedAt,
        unread: !lastRead || thread.lastPostedAt > lastRead,
        author: thread.author,
      };
    }),
  };
}

type PostRow = {
  id: string;
  authorId: string;
  parentId: string | null;
  body: unknown;
  createdAt: Date;
  editedAt: Date | null;
  author: { id: string; name: string };
  replies: { id: string }[];
  reactions: { emoji: string; userId: string; user: { name: string } }[];
};

function toPostNode(
  post: PostRow,
  children: ForumPostNode[],
  user: { id: string; isAdmin?: boolean | null },
  moderatorIds: string[],
): ForumPostNode {
  const reactionMap = new Map<string, ForumPostReactionSummary>();
  for (const emoji of FORUM_EMOJIS) {
    reactionMap.set(emoji, emptyReaction(emoji));
  }
  for (const reaction of post.reactions) {
    const current = reactionMap.get(reaction.emoji) ?? emptyReaction(reaction.emoji);
    current.count += 1;
    current.names.push(reaction.user.name);
    if (reaction.userId === user.id) current.reacted = true;
    reactionMap.set(reaction.emoji, current);
  }

  const hasReplies = post.replies.length > 0 || children.length > 0;
  return {
    id: post.id,
    author: post.author,
    body: post.body,
    createdAt: post.createdAt,
    editedAt: post.editedAt,
    parentId: post.parentId,
    hasReplies,
    canEdit: canEditPost(user, post.authorId),
    canDelete: canDeletePost(user, post.authorId, hasReplies, moderatorIds),
    reactions: FORUM_EMOJIS.map((emoji) => reactionMap.get(emoji) ?? emptyReaction(emoji)),
    replies: children,
  };
}

export async function findForumThread(
  threadId: string,
  user: { id: string; isAdmin?: boolean | null },
  page: number,
): Promise<ForumThreadRecord | null> {
  const thread = await db.forumThread.findUnique({
    where: { id: threadId },
    include: {
      author: { select: authorSelect },
      board: {
        select: {
          id: true,
          name: true,
          slug: true,
          moderators: { select: { userId: true } },
        },
      },
    },
  });
  if (!thread) return null;

  const moderatorIds = thread.board.moderators.map((mod) => mod.userId);
  const safePage = Math.max(1, page);

  const original = await db.forumPost.findFirst({
    where: { threadId, parentId: null },
    include: {
      author: { select: authorSelect },
      replies: { select: { id: true } },
      reactions: { select: reactionSelect },
    },
    orderBy: { createdAt: 'asc' },
  });

  const firstLevelWhere = { threadId, parentId: original?.id ?? '__none__' };
  const [firstLevelTotal, firstLevelRows] = original
    ? await Promise.all([
        db.forumPost.count({ where: firstLevelWhere }),
        db.forumPost.findMany({
          where: firstLevelWhere,
          orderBy: { createdAt: 'asc' },
          skip: (safePage - 1) * FORUM_PAGE_SIZE,
          take: FORUM_PAGE_SIZE,
          include: {
            author: { select: authorSelect },
            replies: { select: { id: true } },
            reactions: { select: reactionSelect },
          },
        }),
      ])
    : [0, [] as PostRow[]];

  const nestedParentIds = firstLevelRows.map((row) => row.id);
  const nestedRows =
    nestedParentIds.length > 0
      ? await db.forumPost.findMany({
          where: { threadId, parentId: { in: nestedParentIds } },
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: authorSelect },
            replies: { select: { id: true } },
            reactions: { select: reactionSelect },
          },
        })
      : [];

  const nestedByParent = new Map<string, ForumPostNode[]>();
  for (const nested of nestedRows) {
    const node = toPostNode(nested, [], user, moderatorIds);
    const list = nestedByParent.get(nested.parentId ?? '') ?? [];
    list.push(node);
    nestedByParent.set(nested.parentId ?? '', list);
  }

  const firstLevelPosts = firstLevelRows.map((row) =>
    toPostNode(row, nestedByParent.get(row.id) ?? [], user, moderatorIds),
  );

  return {
    id: thread.id,
    title: thread.title,
    pinned: thread.pinned,
    locked: thread.locked,
    replyCount: thread.replyCount,
    board: { id: thread.board.id, name: thread.board.name, slug: thread.board.slug },
    author: thread.author,
    canModerate: canModerateBoard(user, moderatorIds),
    canRename: canRenameThread(user, thread.authorId, moderatorIds),
    canDelete: canDeleteThread(user, thread.authorId, thread.replyCount, moderatorIds),
    originalPost: original ? toPostNode(original, [], user, moderatorIds) : null,
    firstLevelPosts,
    firstLevelTotal,
    page: safePage,
    pageSize: FORUM_PAGE_SIZE,
  };
}

export async function markThreadRead(threadId: string, userId: string) {
  const now = new Date();
  await db.forumThreadRead.upsert({
    where: { threadId_userId: { threadId, userId } },
    create: { threadId, userId, lastReadAt: now },
    update: { lastReadAt: now },
  });
}
