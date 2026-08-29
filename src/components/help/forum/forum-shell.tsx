'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { ForumBoardListItem, ForumManagerOption } from '@/types/forum';

import { ForumBoardDialog } from './forum-board-dialog';

type ForumShellProps = {
  isAdmin: boolean;
  boards: ForumBoardListItem[];
  managers: ForumManagerOption[];
  newThreadHref?: string;
  flush?: boolean;
  children: ReactNode;
};

export function ForumShell({ isAdmin, boards, managers, newThreadHref, flush = false, children }: ForumShellProps) {
  const t = useTranslations('help.forumPage');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <div className="flex flex-wrap gap-2">
          {isAdmin ? <ForumBoardDialog boards={boards} managers={managers} /> : null}
          {newThreadHref ? (
            <Button asChild size="sm">
              <Link href={newThreadHref}>
                <Plus className="mr-2 h-4 w-4" />
                {t('newThread')}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card">
        <div className={cn('min-h-0 flex-1 overflow-y-auto', !flush && 'p-6')}>{children}</div>
      </div>
    </div>
  );
}
