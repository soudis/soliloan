'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

type ForumEmptyStateProps = {
  isAdmin: boolean;
  onCreate?: () => void;
};

export function ForumEmptyState({ isAdmin, onCreate }: ForumEmptyStateProps) {
  const t = useTranslations('help.forumPage');

  return (
    <div className="flex min-h-[12rem] flex-col items-start justify-center gap-3">
      <h2 className="text-xl font-semibold">{t('emptyTitle')}</h2>
      <p className="text-muted-foreground">{t('emptyDescription')}</p>
      {isAdmin && onCreate ? (
        <Button type="button" onClick={onCreate}>
          {t('emptyCta')}
        </Button>
      ) : null}
    </div>
  );
}
