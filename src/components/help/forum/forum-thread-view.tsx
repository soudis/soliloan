'use client';

import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { parseAsInteger, useQueryState } from 'nuqs';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from '@/i18n/navigation';
import { FORUM_PAGE_SIZE } from '@/lib/help/forum-constants';
import type { FaqTocArticle } from '@/types/faq';
import type { ForumBoardListItem, ForumThreadRecord } from '@/types/forum';

import { ForumPost } from './forum-post';
import { ForumPostForm } from './forum-post-form';
import { ForumThreadActions } from './forum-thread-actions';

type ForumThreadViewProps = {
  thread: ForumThreadRecord;
  boards: Pick<ForumBoardListItem, 'id' | 'name'>[];
  pickerArticles: Pick<FaqTocArticle, 'title' | 'slug'>[];
};

export function ForumThreadView({ thread, boards, pickerArticles }: ForumThreadViewProps) {
  const t = useTranslations('help.forumPage');
  const [page, setPage] = useQueryState(
    'page',
    parseAsInteger.withDefault(1).withOptions({ shallow: false, history: 'replace' }),
  );
  const pages = Math.max(1, Math.ceil(thread.firstLevelTotal / FORUM_PAGE_SIZE));

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-card px-6 py-4">
        <div className="flex min-w-0 items-start gap-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="ghost" size="icon" className="mt-0.5 shrink-0 text-muted-foreground">
                  <Link href={`/help/forum/${thread.board.slug}`}>
                    <ChevronLeft className="h-5 w-5" />
                    <span className="sr-only">{t('backToBoard')}</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('backToBoard')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">{thread.title}</h2>
              {thread.pinned ? <Badge variant="secondary">{t('pinned')}</Badge> : null}
              {thread.locked ? <Badge variant="outline">{t('locked')}</Badge> : null}
            </div>
            <p className="text-sm text-muted-foreground">{t('author', { name: thread.author.name })}</p>
          </div>
        </div>
        <ForumThreadActions thread={thread} boards={boards} />
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {thread.originalPost ? (
          <ForumPost
            post={thread.originalPost}
            threadId={thread.id}
            boardSlug={thread.board.slug}
            locked={thread.locked}
            pickerArticles={pickerArticles}
          />
        ) : null}

        {thread.firstLevelPosts.map((post) => (
          <ForumPost
            key={post.id}
            post={post}
            threadId={thread.id}
            boardSlug={thread.board.slug}
            locked={thread.locked}
            pickerArticles={pickerArticles}
          />
        ))}

        {pages > 1 ? (
          <div className="flex items-center justify-between gap-3 py-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => void setPage(page - 1)}
            >
              {t('pagePrev')}
            </Button>
            <p className="text-sm text-muted-foreground">{t('pageOf', { page, pages })}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => void setPage(page + 1)}
            >
              {t('pageNext')}
            </Button>
          </div>
        ) : null}

        {thread.locked ? (
          <p className="py-4 text-sm text-muted-foreground">{t('lockedHint')}</p>
        ) : thread.originalPost ? (
          <div className="pt-6 pb-6">
            <ForumPostForm
              mode="reply"
              threadId={thread.id}
              parentId={thread.originalPost.id}
              pickerArticles={pickerArticles}
              compact={false}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
