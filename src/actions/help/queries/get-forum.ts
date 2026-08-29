'use server';

import {
  findForumBoardBySlug,
  findForumBoards,
  findForumThread,
  findForumThreads,
  markThreadRead,
} from '@/lib/help/find-forum';
import { findManagerUsers } from '@/lib/help/forum-db';

export async function getForumBoardsUnsafe(userId: string) {
  return findForumBoards(userId);
}

export async function getForumBoardBySlugUnsafe(slug: string) {
  return findForumBoardBySlug(slug);
}

export async function getForumThreadsUnsafe(boardId: string, userId: string, options: { query: string; page: number }) {
  return findForumThreads(boardId, userId, options);
}

export async function getForumThreadUnsafe(
  threadId: string,
  user: { id: string; isAdmin?: boolean | null },
  page: number,
) {
  return findForumThread(threadId, user, page);
}

export async function markForumThreadReadUnsafe(threadId: string, userId: string) {
  await markThreadRead(threadId, userId);
}

export async function getForumManagerUsersUnsafe() {
  return findManagerUsers();
}
