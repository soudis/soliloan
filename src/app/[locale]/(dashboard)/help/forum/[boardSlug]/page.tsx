import { notFound } from 'next/navigation';

import {
  getForumBoardBySlugUnsafe,
  getForumBoardsUnsafe,
  getForumManagerUsersUnsafe,
  getForumThreadsUnsafe,
} from '@/actions/help';
import { ForumShell } from '@/components/help/forum/forum-shell';
import { ForumThreadList } from '@/components/help/forum/forum-thread-list';
import { forumUserFromSession } from '@/lib/help/forum-permissions';
import { requireManager } from '@/lib/require-session';

type ForumBoardPageProps = {
  params: Promise<{ boardSlug: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
};

export default async function ForumBoardPage({ params, searchParams }: ForumBoardPageProps) {
  const session = await requireManager();
  const isAdmin = Boolean(session.user.isAdmin);
  const user = forumUserFromSession(session.user);
  const { boardSlug } = await params;
  const { q = '', page = '1' } = await searchParams;
  const board = await getForumBoardBySlugUnsafe(boardSlug);
  if (!board) {
    notFound();
  }

  const [{ threads, total }, boards, managers] = await Promise.all([
    getForumThreadsUnsafe(board.id, user.id, { query: q, page: Number(page) || 1 }),
    getForumBoardsUnsafe(user.id),
    isAdmin ? getForumManagerUsersUnsafe() : Promise.resolve([]),
  ]);

  return (
    <ForumShell isAdmin={isAdmin} boards={boards} managers={managers} newThreadHref={`/help/forum/${board.slug}/new`}>
      <ForumThreadList board={board} threads={threads} total={total} />
    </ForumShell>
  );
}
