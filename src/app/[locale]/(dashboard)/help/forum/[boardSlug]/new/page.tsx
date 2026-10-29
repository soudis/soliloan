import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ForumShell } from '@/components/help/forum/forum-shell';
import { ForumThreadForm } from '@/components/help/forum/forum-thread-form';
import { findFaqToc } from '@/lib/help/find-faq-toc';
import { findForumBoardBySlug } from '@/lib/help/find-forum';
import { forumUserFromSession } from '@/lib/help/forum-permissions';
import { isForumBoardSubscribed } from '@/lib/help/forum-subscriptions';
import { requireManager } from '@/lib/require-session';
import { flattenFaqTocArticles } from '@/types/faq';

type NewForumThreadPageProps = {
  params: Promise<{ boardSlug: string }>;
};

export default async function NewForumThreadPage({ params }: NewForumThreadPageProps) {
  const session = await requireManager();
  const isAdmin = Boolean(session.user.isAdmin);
  const user = forumUserFromSession(session.user);
  const { boardSlug } = await params;
  const [board, toc, t] = await Promise.all([
    findForumBoardBySlug(boardSlug),
    findFaqToc(isAdmin),
    getTranslations('help.threadForm'),
  ]);

  if (!board) {
    notFound();
  }

  const watchingBoard = await isForumBoardSubscribed(user.id, board.id);

  return (
    <ForumShell
      isAdmin={isAdmin}
      board={{ id: board.id, name: board.name, slug: board.slug }}
      boardCurrent={false}
      watchingBoard={watchingBoard}
    >
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('createTitle')}</h1>
        <ForumThreadForm boardId={board.id} boardSlug={board.slug} pickerArticles={flattenFaqTocArticles(toc)} />
      </div>
    </ForumShell>
  );
}
