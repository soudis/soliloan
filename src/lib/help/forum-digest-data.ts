import { db } from '@/lib/db';
import { FORUM_DIGEST_THREAD_CAP } from '@/lib/help/forum-constants';
import {
  accountForumAbsoluteUrl,
  forumBoardAbsoluteUrl,
  forumHomeAbsoluteUrl,
  forumThreadAbsoluteUrl,
} from '@/lib/help/forum-urls';

const EPOCH = new Date(0);

export type ForumDigestThreadRow = {
  id: string;
  title: string;
  lastPostedAt: Date;
  unreadCount: number;
  board: { id: string; name: string; slug: string };
};

export type ForumDigestSnapshot = {
  asOf: Date;
  threadCount: number;
  hasMoreThreads: boolean;
  threads: ForumDigestThreadRow[];
};

export type ForumDigestMergeData = {
  threadCount: number;
  hasMoreThreads: boolean;
  manageUrl: string;
  digest: { threadCount: number; hasMoreThreads: boolean; manageUrl: string };
  threads: Array<{
    thread: { title: string; url: string; unreadCount: number };
    board: { name: string; slug: string; url: string };
  }>;
  moreThreads: Array<{ moreThread: { url: string } }>;
};

type DigestThread = {
  id: string;
  title: string;
  lastPostedAt: Date;
  board: { id: string; name: string; slug: string };
};

function laterDate(a: Date, b: Date) {
  return a > b ? a : b;
}

export async function collectForumDigestThreads(userId: string, asOf = new Date()): Promise<ForumDigestSnapshot> {
  const [threadSubs, boardSubs, mutes] = await Promise.all([
    db.forumThreadSubscription.findMany({
      where: { userId },
      select: {
        threadId: true,
        createdAt: true,
        thread: {
          select: {
            id: true,
            title: true,
            lastPostedAt: true,
            board: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    }),
    db.forumBoardSubscription.findMany({
      where: { userId },
      select: {
        boardId: true,
        createdAt: true,
        board: { select: { id: true, name: true, slug: true } },
      },
    }),
    db.forumThreadMute.findMany({
      where: { userId },
      select: { threadId: true },
    }),
  ]);

  const mutedIds = new Set(mutes.map((row) => row.threadId));
  const boardSubscribeAt = new Map(boardSubs.map((row) => [row.boardId, row.createdAt]));
  const followedBoardIds = [...boardSubscribeAt.keys()];
  const threadsById = new Map<string, DigestThread>();
  const subscribeAtByThread = new Map<string, Date>();

  if (followedBoardIds.length > 0) {
    const earlierDate: (earliest: Date, date: Date) => Date = (earliest, date) => {
      // biome-ignore lint/complexity/useMathMinMax: Math.min() returns a number; Prisma needs a Date here.
      return date < earliest ? date : earliest;
    };
    const minBoardAt = [...boardSubscribeAt.values()].reduce(earlierDate);
    const boardThreads = await db.forumThread.findMany({
      where: {
        boardId: { in: followedBoardIds },
        lastPostedAt: { gt: minBoardAt },
        ...(mutedIds.size > 0 ? { id: { notIn: [...mutedIds] } } : {}),
      },
      select: {
        id: true,
        title: true,
        lastPostedAt: true,
        boardId: true,
        board: { select: { id: true, name: true, slug: true } },
      },
    });

    for (const thread of boardThreads) {
      if (mutedIds.has(thread.id)) continue;
      const boardAt = boardSubscribeAt.get(thread.boardId) ?? EPOCH;
      if (thread.lastPostedAt <= boardAt) continue;
      threadsById.set(thread.id, {
        id: thread.id,
        title: thread.title,
        lastPostedAt: thread.lastPostedAt,
        board: thread.board,
      });
      subscribeAtByThread.set(thread.id, boardAt);
    }
  }

  for (const sub of threadSubs) {
    if (mutedIds.has(sub.thread.id)) continue;
    if (boardSubscribeAt.has(sub.thread.board.id)) continue;
    threadsById.set(sub.thread.id, {
      id: sub.thread.id,
      title: sub.thread.title,
      lastPostedAt: sub.thread.lastPostedAt,
      board: sub.thread.board,
    });
    subscribeAtByThread.set(sub.threadId, sub.createdAt);
  }

  const threadIds = [...threadsById.keys()];
  if (threadIds.length === 0) {
    return { asOf, threadCount: 0, hasMoreThreads: false, threads: [] };
  }

  const [reads, cursors] = await Promise.all([
    db.forumThreadRead.findMany({
      where: { userId, threadId: { in: threadIds } },
      select: { threadId: true, lastReadAt: true },
    }),
    db.forumThreadMailCursor.findMany({
      where: { userId, threadId: { in: threadIds } },
      select: { threadId: true, lastNotifiedAt: true },
    }),
  ]);

  const readByThread = new Map(reads.map((row) => [row.threadId, row.lastReadAt]));
  const cursorByThread = new Map(cursors.map((row) => [row.threadId, row.lastNotifiedAt]));

  const candidates: Array<{ thread: DigestThread; cutoff: Date; lastRead: Date }> = [];
  let minCutoff = asOf;
  for (const thread of threadsById.values()) {
    const subscribeAt = subscribeAtByThread.get(thread.id) ?? EPOCH;
    const cursor = cursorByThread.get(thread.id) ?? EPOCH;
    const cutoff = laterDate(subscribeAt, cursor);
    if (thread.lastPostedAt <= cutoff) continue;
    const lastRead = readByThread.get(thread.id) ?? EPOCH;
    candidates.push({ thread, cutoff, lastRead });
    if (cutoff < minCutoff) minCutoff = cutoff;
  }

  if (candidates.length === 0) {
    return { asOf, threadCount: 0, hasMoreThreads: false, threads: [] };
  }

  const posts = await db.forumPost.findMany({
    where: {
      threadId: { in: candidates.map((row) => row.thread.id) },
      authorId: { not: userId },
      createdAt: { gt: minCutoff, lte: asOf },
    },
    select: { threadId: true, createdAt: true },
  });

  const postsByThread = new Map<string, Date[]>();
  for (const post of posts) {
    const list = postsByThread.get(post.threadId) ?? [];
    list.push(post.createdAt);
    postsByThread.set(post.threadId, list);
  }

  const included: ForumDigestThreadRow[] = [];
  for (const { thread, cutoff, lastRead } of candidates) {
    const createdAts = postsByThread.get(thread.id) ?? [];
    const unreadCount = createdAts.filter((createdAt) => createdAt > cutoff && createdAt > lastRead).length;
    if (unreadCount <= 0) continue;
    included.push({
      id: thread.id,
      title: thread.title,
      lastPostedAt: thread.lastPostedAt,
      unreadCount,
      board: thread.board,
    });
  }

  included.sort((a, b) => b.lastPostedAt.getTime() - a.lastPostedAt.getTime());
  const threadCount = included.length;
  return {
    asOf,
    threadCount,
    hasMoreThreads: threadCount > FORUM_DIGEST_THREAD_CAP,
    threads: included.slice(0, FORUM_DIGEST_THREAD_CAP),
  };
}

export function formatForumDigestMergeData(snapshot: ForumDigestSnapshot, locale: string): ForumDigestMergeData {
  const manageUrl = accountForumAbsoluteUrl(locale);
  const forumHome = forumHomeAbsoluteUrl(locale);
  return {
    threadCount: snapshot.threadCount,
    hasMoreThreads: snapshot.hasMoreThreads,
    manageUrl,
    digest: {
      threadCount: snapshot.threadCount,
      hasMoreThreads: snapshot.hasMoreThreads,
      manageUrl,
    },
    threads: snapshot.threads.map((thread) => ({
      thread: {
        title: thread.title,
        url: forumThreadAbsoluteUrl(thread.board.slug, thread.id, locale),
        unreadCount: thread.unreadCount,
      },
      board: {
        name: thread.board.name,
        slug: thread.board.slug,
        url: forumBoardAbsoluteUrl(thread.board.slug, locale),
      },
    })),
    moreThreads: snapshot.hasMoreThreads ? [{ moreThread: { url: forumHome } }] : [],
  };
}

/** Sample digest rows for USER template preview (send path overwrites with a live snapshot). */
export function sampleForumDigestMergeData(locale = 'de') {
  const now = new Date();
  return formatForumDigestMergeData(
    {
      asOf: now,
      threadCount: 3,
      hasMoreThreads: true,
      threads: [
        {
          id: 'preview-thread-1',
          title: 'Zinsberechnung bei unterjähriger Einzahlung',
          lastPostedAt: now,
          unreadCount: 4,
          board: { id: 'preview-board-1', name: 'Allgemein', slug: 'allgemein' },
        },
        {
          id: 'preview-thread-2',
          title: 'Neues Dokument für Jahresabschluss',
          lastPostedAt: now,
          unreadCount: 1,
          board: { id: 'preview-board-2', name: 'Verwaltung', slug: 'verwaltung' },
        },
      ],
    },
    locale,
  );
}
