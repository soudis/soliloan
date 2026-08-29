import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import {
  getFaqTocUnsafe,
  getForumBoardBySlugUnsafe,
  getForumBoardsUnsafe,
  getForumManagerUsersUnsafe,
} from '@/actions/help';
import { ForumShell } from '@/components/help/forum/forum-shell';
import { ForumThreadForm } from '@/components/help/forum/forum-thread-form';
import { Link } from '@/i18n/navigation';
import { forumUserFromSession } from '@/lib/help/forum-permissions';
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
  const [board, boards, managers, toc, t] = await Promise.all([
    getForumBoardBySlugUnsafe(boardSlug),
    getForumBoardsUnsafe(user.id),
    isAdmin ? getForumManagerUsersUnsafe() : Promise.resolve([]),
    getFaqTocUnsafe(isAdmin),
    getTranslations('help.threadForm'),
  ]);

  if (!board) {
    notFound();
  }

  return (
    <ForumShell isAdmin={isAdmin} boards={boards} managers={managers}>
      <div className="space-y-4">
        <Link href={`/help/forum/${board.slug}`} className="text-sm text-muted-foreground hover:text-foreground">
          {board.name}
        </Link>
        <h2 className="text-2xl font-semibold tracking-tight">{t('createTitle')}</h2>
        <ForumThreadForm boardId={board.id} boardSlug={board.slug} pickerArticles={flattenFaqTocArticles(toc)} />
      </div>
    </ForumShell>
  );
}
