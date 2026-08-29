'use client';

import { Pin, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { markForumBoardReadAction } from '@/actions/help';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useRouter } from '@/i18n/navigation';
import { FORUM_PAGE_SIZE } from '@/lib/help/forum-constants';
import { formatForumRelativeTime } from '@/lib/help/forum-time';
import { cn } from '@/lib/utils';
import type { ForumBoardRecord, ForumThreadListItem } from '@/types/forum';

type ForumThreadListProps = {
  board: ForumBoardRecord;
  threads: ForumThreadListItem[];
  total: number;
};

const forumSearchParser = parseAsString.withDefault('').withOptions({ shallow: false, history: 'replace' });
const forumPageParser = parseAsInteger.withDefault(1).withOptions({ shallow: false, history: 'replace' });

export function ForumThreadList({ board, threads, total }: ForumThreadListProps) {
  const t = useTranslations('help.forumPage');
  const router = useRouter();
  const [query, setQuery] = useQueryState('q', forumSearchParser);
  const [page, setPage] = useQueryState('page', forumPageParser);
  const [searchInput, setSearchInput] = useState(query);
  const { executeAsync: markRead, isExecuting } = useAction(markForumBoardReadAction);
  const pages = Math.max(1, Math.ceil(total / FORUM_PAGE_SIZE));
  const hasUnread = threads.some((thread) => thread.unread) || (query === '' && total > 0);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const next = searchInput.trim();
      if (next === query) return;
      void setQuery(next || null);
      void setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [query, searchInput, setPage, setQuery]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link href="/help/forum" className="text-sm text-muted-foreground hover:text-foreground">
            {t('backToForum')}
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight">{board.name}</h2>
          {board.description ? <p className="text-muted-foreground">{board.description}</p> : null}
          <p className="text-sm text-muted-foreground">
            {board.moderators.length > 0
              ? `${t('moderators')}: ${board.moderators.map((mod) => mod.name).join(', ')}`
              : t('noModerators')}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isExecuting || !hasUnread}
          onClick={async () => {
            const result = await markRead({ id: board.id });
            if (result?.serverError) {
              toast.error(result.serverError);
              return;
            }
            toast.success(t('markedRead'));
            router.refresh();
          }}
        >
          {t('markBoardRead')}
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t('searchPlaceholder')}
          className="pl-9"
        />
      </div>

      {threads.length === 0 ? (
        <div className="space-y-3">
          <p className="text-muted-foreground">{query ? t('noSearchResults') : t('emptyThreadsDescription')}</p>
          {!query ? (
            <Button asChild>
              <Link href={`/help/forum/${board.slug}/new`}>{t('emptyThreadsCta')}</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/help/forum/${board.slug}/${thread.id}`}
              className={cn(
                'flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40',
                thread.unread && 'bg-muted/20',
              )}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {thread.pinned ? <Pin className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                  <span className="font-medium">{thread.title}</span>
                  {thread.locked ? <Badge variant="outline">{t('locked')}</Badge> : null}
                  {thread.unread ? <Badge variant="secondary">{t('unread')}</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">{t('author', { name: thread.author.name })}</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>{t('replies', { count: thread.replyCount })}</p>
                <p>{formatForumRelativeTime(thread.lastPostedAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => void setPage(page - 1)}>
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
    </div>
  );
}
