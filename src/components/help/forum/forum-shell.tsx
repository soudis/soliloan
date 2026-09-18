'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import type { ReactNode } from 'react';
import { toast } from 'sonner';

import { markForumBoardReadAction } from '@/actions/help';
import { HelpSearch } from '@/components/help/help-search';
import { ActionButton } from '@/components/ui/action-button';
import { Button } from '@/components/ui/button';
import { Link, useRouter } from '@/i18n/navigation';
import type { ForumBoardListItem, ForumManagerOption } from '@/types/forum';

import { ForumBoardDialog } from './forum-board-dialog';
import { ForumWatchButton } from './forum-watch-button';

type ForumShellProps = {
  isAdmin: boolean;
  boards?: ForumBoardListItem[];
  managers?: ForumManagerOption[];
  board?: { id: string; name: string; slug: string };
  boardCurrent?: boolean;
  newThreadHref?: string;
  showManageBoards?: boolean;
  showMarkRead?: boolean;
  hasUnread?: boolean;
  watchingBoard?: boolean;
  children: ReactNode;
};

export function ForumShell({
  isAdmin,
  boards = [],
  managers = [],
  board,
  boardCurrent = true,
  newThreadHref,
  showManageBoards = false,
  showMarkRead = false,
  hasUnread = false,
  watchingBoard = false,
  children,
}: ForumShellProps) {
  const t = useTranslations('help.forumPage');
  const router = useRouter();
  const { executeAsync: markRead, isExecuting } = useAction(markForumBoardReadAction);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-6 flex shrink-0 flex-wrap items-center justify-between gap-3">
        {board ? (
          <nav aria-label={t('breadcrumb')} className="flex min-w-0 items-baseline gap-2 text-3xl font-bold">
            <Link href="/help/forum" className="shrink-0 text-muted-foreground hover:text-foreground">
              {t('title')}
            </Link>
            <span className="shrink-0 font-semibold text-muted-foreground/40" aria-hidden>
              /
            </span>
            {boardCurrent ? (
              <h1 className="truncate">{board.name}</h1>
            ) : (
              <Link href={`/help/forum/${board.slug}`} className="truncate hover:text-foreground">
                {board.name}
              </Link>
            )}
          </nav>
        ) : (
          <h1 className="text-3xl font-bold">{t('title')}</h1>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <HelpSearch primary="forum" />
          {board ? (
            <ForumWatchButton
              key={`${board.id}-${watchingBoard}`}
              kind="board"
              id={board.id}
              watching={watchingBoard}
            />
          ) : null}
          {showMarkRead && board ? (
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
          ) : null}
          {showManageBoards && isAdmin ? <ForumBoardDialog boards={boards} managers={managers} /> : null}
          {newThreadHref ? (
            <ActionButton
              intent="add"
              density="header"
              icon={<Plus className="h-4 w-4" />}
              label={t('newThread')}
              onClick={() => router.push(newThreadHref)}
            />
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
