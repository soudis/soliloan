import { notFound } from 'next/navigation';
import { ForumShell } from '@/components/help/forum/forum-shell';
import { ForumThreadView } from '@/components/help/forum/forum-thread-view';
import { findFaqToc } from '@/lib/help/find-faq-toc';
import { findForumBoardBySlug, findForumBoardOptions, findForumThread, markThreadRead } from '@/lib/help/find-forum';
import { forumUserFromSession } from '@/lib/help/forum-permissions';
import { getForumThreadWatchState } from '@/lib/help/forum-subscriptions';
import { requireManager } from '@/lib/require-session';
import { flattenFaqTocArticles } from '@/types/faq';

type ForumThreadPageProps = {
  params: Promise<{ boardSlug: string; threadId: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function ForumThreadPage({ params, searchParams }: ForumThreadPageProps) {
  const session = await requireManager();
  const isAdmin = Boolean(session.user.isAdmin);
  const user = forumUserFromSession(session.user);
  const { boardSlug, threadId } = await params;
  const { page = '1' } = await searchParams;

  const [board, thread] = await Promise.all([
    findForumBoardBySlug(boardSlug),
    findForumThread(threadId, user, Number(page) || 1),
  ]);

  if (!board || !thread || thread.board.id !== board.id) {
    notFound();
  }

  await markThreadRead(thread.id, user.id);

  const [boards, toc, watch] = await Promise.all([
    findForumBoardOptions(),
    findFaqToc(isAdmin),
    getForumThreadWatchState(user.id, thread.id, board.id),
  ]);

  return (
    <ForumShell
      isAdmin={isAdmin}
      board={{ id: board.id, name: board.name, slug: board.slug }}
      boardCurrent={false}
      newThreadHref={`/help/forum/${board.slug}/new`}
      watchingBoard={watch.boardWatching}
    >
      <ForumThreadView
        thread={thread}
        boards={boards}
        pickerArticles={flattenFaqTocArticles(toc)}
        currentUser={{
          id: user.id,
          name: session.user.name?.trim() || '',
        }}
        watchingThread={watch.watchingThread}
        watchingBoard={watch.boardWatching}
      />
    </ForumShell>
  );
}
