import 'server-only';

import { db } from '@/lib/db';

export async function getForumSubscriptionsUnsafe(userId: string) {
  const [threads, boards, mutes] = await Promise.all([
    db.forumThreadSubscription.findMany({
      where: { userId, thread: { mutes: { none: { userId } } } },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        thread: {
          select: {
            id: true,
            title: true,
            board: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    }),
    db.forumBoardSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        board: { select: { id: true, name: true, slug: true } },
      },
    }),
    db.forumThreadMute.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        thread: {
          select: {
            id: true,
            title: true,
            board: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    }),
  ]);

  return {
    threads: threads.map((row) => ({
      id: row.thread.id,
      title: row.thread.title,
      boardName: row.thread.board.name,
      boardSlug: row.thread.board.slug,
      createdAt: row.createdAt,
    })),
    boards: boards.map((row) => ({
      id: row.board.id,
      name: row.board.name,
      slug: row.board.slug,
      createdAt: row.createdAt,
    })),
    mutes: mutes.map((row) => ({
      id: row.thread.id,
      title: row.thread.title,
      boardName: row.thread.board.name,
      boardSlug: row.thread.board.slug,
      createdAt: row.createdAt,
    })),
  };
}
