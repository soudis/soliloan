import { notFound } from 'next/navigation';

import {
  getFaqTocUnsafe,
  getForumBoardBySlugUnsafe,
  getForumBoardsUnsafe,
  getForumManagerUsersUnsafe,
  getForumThreadUnsafe,
  markForumThreadReadUnsafe,
} from '@/actions/help';
import { ForumShell } from '@/components/help/forum/forum-shell';
import { ForumThreadView } from '@/components/help/forum/forum-thread-view';
import { forumUserFromSession } from '@/lib/help/forum-permissions';
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
    getForumBoardBySlugUnsafe(boardSlug),
    getForumThreadUnsafe(threadId, user, Number(page) || 1),
  ]);

  if (!board || !thread || thread.board.id !== board.id) {
    notFound();
  }

  await markForumThreadReadUnsafe(thread.id, user.id);

  const [boards, managers, toc] = await Promise.all([
    getForumBoardsUnsafe(user.id),
    isAdmin ? getForumManagerUsersUnsafe() : Promise.resolve([]),
    getFaqTocUnsafe(isAdmin),
  ]);

  return (
    <ForumShell
      isAdmin={isAdmin}
      boards={boards}
      managers={managers}
      newThreadHref={`/help/forum/${board.slug}/new`}
      flush
    >
      <ForumThreadView thread={thread} boards={boards} pickerArticles={flattenFaqTocArticles(toc)} />
    </ForumShell>
  );
}
