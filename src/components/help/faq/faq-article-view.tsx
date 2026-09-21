'use client';

import type { JSONContent } from '@tiptap/core';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { parseAsBoolean, useQueryState } from 'nuqs';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteFaqArticleAction } from '@/actions/help';
import { ActionButton } from '@/components/ui/action-button';
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
      <div className="space-y-6 pb-12">
        <h1 className="text-2xl font-semibold tracking-tight">{tForm('editTitle')}</h1>
        <FaqArticleForm
          initialData={article}
          categories={categories}
          pickerArticles={pickerArticles}
          onCancel={() => void setEditing(false)}
          onSaved={() => void setEditing(false)}
        />
      </div>
    );
  }

  return (
    <article className="pb-16">
      <div className="mb-8 flex flex-wrap items-center gap-2 pt-1">
        <h1 className="text-3xl font-semibold tracking-tight">{article.title}</h1>
        {!article.published && isAdmin ? <Badge variant="secondary">{t('draft')}</Badge> : null}
        {isAdmin ? (
          <>
            <ActionButton
              intent="edit"
              density="icon"
              icon={<Pencil className="h-4 w-4" />}
              tooltip={tUi('edit')}
              srOnly={tUi('edit')}
              onClick={() => void setEditing(true)}
            />
            <ActionButton
              intent="delete"
              density="icon"
              icon={<Trash2 className="h-4 w-4" />}
              tooltip={tUi('delete')}
              srOnly={tUi('delete')}
              onClick={() => setConfirmDelete(true)}
            />
          </>
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
