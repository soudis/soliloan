import { notFound } from 'next/navigation';
import { ForumShell } from '@/components/help/forum/forum-shell';
import { ForumThreadList } from '@/components/help/forum/forum-thread-list';
import { boardHasUnread, findForumBoardBySlug, findForumThreads } from '@/lib/help/find-forum';
import { forumUserFromSession } from '@/lib/help/forum-permissions';
import { isForumBoardSubscribed } from '@/lib/help/forum-subscriptions';
import { requireManager } from '@/lib/require-session';

type ForumBoardPageProps = {
  params: Promise<{ boardSlug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function ForumBoardPage({ params, searchParams }: ForumBoardPageProps) {
  const session = await requireManager();
  const isAdmin = Boolean(session.user.isAdmin);
  const user = forumUserFromSession(session.user);
  const { boardSlug } = await params;
  const { page = '1' } = await searchParams;
  const board = await findForumBoardBySlug(boardSlug);
  if (!board) {
    notFound();
  }

  const [{ threads, total }, hasUnread, watchingBoard] = await Promise.all([
    findForumThreads(board.id, user.id, { page: Number(page) || 1 }),
    boardHasUnread(board.id, user.id),
    isForumBoardSubscribed(user.id, board.id),
  ]);

  return (
    <ForumShell
      isAdmin={isAdmin}
      board={{ id: board.id, name: board.name, slug: board.slug }}
      newThreadHref={`/help/forum/${board.slug}/new`}
      showMarkRead
      hasUnread={hasUnread}
      watchingBoard={watchingBoard}
    >
      <ForumThreadList board={board} threads={threads} total={total} />
    </ForumShell>
  );
}
