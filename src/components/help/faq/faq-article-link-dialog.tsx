'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { FaqTocArticle } from '@/types/faq';

type FaqArticleLinkDialogProps = {
  open: boolean;
  initialHref?: string;
  articles: Pick<FaqTocArticle, 'title' | 'slug'>[];
  onOpenChange: (open: boolean) => void;
  onApply: (href: string) => void;
  onRemove: () => void;
};

export function FaqArticleLinkDialog({
  open,
  initialHref,
  articles,
  onOpenChange,
  onApply,
  onRemove,
}: FaqArticleLinkDialogProps) {
  const t = useTranslations('help.editor');
  const [href, setHref] = useState(initialHref ?? '');

  const sortedArticles = useMemo(() => [...articles].sort((a, b) => a.title.localeCompare(b.title, 'de')), [articles]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setHref(initialHref ?? '');
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('linkDialogTitle')}</DialogTitle>
          <DialogDescription>{t('linkDialogDescription')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="faq-link-url">
              {t('linkUrl')}
            </label>
            <Input
              id="faq-link-url"
              value={href}
              onChange={(event) => setHref(event.target.value)}
              placeholder={t('linkUrlPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('linkArticles')}</p>
            <div className="max-h-48 overflow-y-auto rounded-md border">
              {sortedArticles.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">{t('noArticles')}</p>
              ) : (
                sortedArticles.map((article) => (
                  <button
                    key={article.slug}
                    type="button"
                    className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-accent"
                    onClick={() => setHref(`/help/faq/${article.slug}`)}
                  >
                    {article.title}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          {initialHref ? (
            <Button type="button" variant="outline" onClick={onRemove}>
              {t('unlink')}
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={() => {
              const next = href.trim();
              if (next) onApply(next);
            }}
          >
            {t('linkApply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
