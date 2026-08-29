'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createFaqArticleAction, updateFaqArticleAction } from '@/actions/help';
import { Form } from '@/components/ui/form';
import { FormActions } from '@/components/ui/form-actions';
import { useRouter } from '@/i18n/navigation';
import { EMPTY_FAQ_DOC } from '@/lib/help/faq-constants';
import { slugify } from '@/lib/help/slugify';
import { type FaqArticleFormData, faqArticleFormSchema } from '@/lib/schemas/faq';
import { serializeRichTextBody } from '@/lib/schemas/rich-text';
import type { FaqArticleRecord, FaqTocArticle, FaqTocCategory } from '@/types/faq';

import { FaqArticleFormFields } from './faq-article-form-fields';

type FaqArticleFormProps = {
  initialData?: FaqArticleRecord;
  categories: Pick<FaqTocCategory, 'id' | 'name'>[];
  pickerArticles: Pick<FaqTocArticle, 'title' | 'slug'>[];
  onCancel?: () => void;
};

export function FaqArticleForm({ initialData, categories, pickerArticles, onCancel }: FaqArticleFormProps) {
  const t = useTranslations('help.articleForm');
  const tPage = useTranslations('help.faqPage');
  const tUi = useTranslations('common.ui.actions');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const isEditMode = Boolean(initialData?.id);
  const slugTouchedRef = useRef(isEditMode);

  const { executeAsync: create, isExecuting: isCreating } = useAction(createFaqArticleAction);
  const { executeAsync: update, isExecuting: isUpdating } = useAction(updateFaqArticleAction);

  const form = useForm({
    resolver: zodResolver(faqArticleFormSchema),
    defaultValues: {
      title: initialData?.title ?? '',
      slug: initialData?.slug ?? '',
      categoryId: initialData?.categoryId ?? (categories.length === 1 ? categories[0].id : ''),
      published: initialData?.published ?? false,
      body: initialData?.body ?? EMPTY_FAQ_DOC,
    },
  });

  const titleValue = form.watch('title');
  useEffect(() => {
    if (slugTouchedRef.current) return;
    form.setValue('slug', titleValue ? slugify(String(titleValue)) : '', { shouldDirty: false });
  }, [form, titleValue]);

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      setError(null);
      const payload = { ...data, body: serializeRichTextBody(data.body) };
      const result = isEditMode ? await update({ ...payload, id: initialData?.id ?? '' }) : await create(payload);

      if (result?.data && 'fieldErrors' in result.data && result.data.fieldErrors) {
        for (const [field, message] of Object.entries(result.data.fieldErrors)) {
          form.setError(field as keyof FaqArticleFormData, { type: 'server', message: message as string });
        }
        return;
      }
      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      const slug = result?.data && 'article' in result.data ? result.data.article.slug : data.slug;
      toast.success(tPage('saved'));
      router.push(`/help/faq/${slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : tPage('saveError'));
      toast.error(tPage('saveError'));
    }
  });

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
        onChange={(event) => {
          const target = event.target;
          if (target instanceof HTMLInputElement && target.name === 'slug') {
            slugTouchedRef.current = true;
          }
        }}
      >
        {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
        {categories.length === 0 ? <p className="mb-4 text-sm text-muted-foreground">{t('needsCategory')}</p> : null}
        <FaqArticleFormFields
          categories={categories}
          pickerArticles={pickerArticles}
          labels={{
            title: t('title'),
            titlePlaceholder: t('titlePlaceholder'),
            slug: t('slug'),
            slugPlaceholder: t('slugPlaceholder'),
            category: t('category'),
            categoryPlaceholder: t('categoryPlaceholder'),
            published: t('published'),
            publishedHint: t('publishedHint'),
            body: t('body'),
          }}
        />
        <FormActions
          submitButtonText={tUi('save')}
          submittingButtonText={tUi('saving')}
          cancelButtonText={tUi('cancel')}
          isLoading={isCreating || isUpdating}
          onCancel={onCancel}
        />
      </form>
    </Form>
  );
}
