'use client';

import type { JSONContent } from '@tiptap/core';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { parseAsBoolean, useQueryState } from 'nuqs';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteFaqArticleAction } from '@/actions/help';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import type { FaqArticleRecord, FaqTocArticle, FaqTocCategory } from '@/types/faq';

import { FaqArticleForm } from './faq-article-form';
import { FaqTiptapRenderer } from './faq-tiptap-renderer';

type FaqArticleViewProps = {
  article: FaqArticleRecord;
  isAdmin: boolean;
  categories: Pick<FaqTocCategory, 'id' | 'name'>[];
  pickerArticles: Pick<FaqTocArticle, 'title' | 'slug'>[];
};

export function FaqArticleView({ article, isAdmin, categories, pickerArticles }: FaqArticleViewProps) {
  const t = useTranslations('help.faqPage');
  const tForm = useTranslations('help.articleForm');
  const tUi = useTranslations('common.ui.actions');
  const router = useRouter();
  const [editing, setEditing] = useQueryState('edit', parseAsBoolean.withDefault(false));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { executeAsync: remove, isExecuting } = useAction(deleteFaqArticleAction);

  if (isAdmin && editing) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{tForm('editTitle')}</h1>
        <FaqArticleForm
          initialData={article}
          categories={categories}
          pickerArticles={pickerArticles}
          onCancel={() => void setEditing(false)}
        />
      </div>
    );
  }

  return (
    <article className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{article.title}</h1>
          {!article.published && isAdmin ? <Badge variant="secondary">{t('draft')}</Badge> : null}
        </div>
        {isAdmin ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void setEditing(true)}>
              {tUi('edit')}
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
              {tUi('delete')}
            </Button>
          </div>
        ) : null}
      </div>
      <FaqTiptapRenderer content={article.body as JSONContent} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tUi('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={isExecuting}
              onClick={async () => {
                const result = await remove({ id: article.id });
                if (result?.serverError) {
                  toast.error(result.serverError);
                  return;
                }
                toast.success(t('deleted'));
                router.push('/help/faq');
                router.refresh();
              }}
            >
              {tUi('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
