'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createFaqCategoryAction, updateFaqCategoryAction } from '@/actions/help';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { slugify } from '@/lib/help/slugify';
import { type FaqCategoryFormData, faqCategoryFormSchema } from '@/lib/schemas/faq';
import type { FaqTocCategory } from '@/types/faq';

import { FaqCategoryFormFields } from './faq-category-form-fields';

type FaqCategoryFormProps = {
  initialData?: Pick<FaqTocCategory, 'id' | 'name' | 'slug'>;
  onSuccess?: () => void;
};

export function FaqCategoryForm({ initialData, onSuccess }: FaqCategoryFormProps) {
  const t = useTranslations('help.categoryDialog');
  const tUi = useTranslations('common.ui.actions');
  const isEditMode = Boolean(initialData?.id);
  const slugTouchedRef = useRef(isEditMode);

  const { executeAsync: create, isExecuting: isCreating } = useAction(createFaqCategoryAction);
  const { executeAsync: update, isExecuting: isUpdating } = useAction(updateFaqCategoryAction);

  const form = useForm({
    resolver: zodResolver(faqCategoryFormSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      slug: initialData?.slug ?? '',
    },
  });

  const nameValue = form.watch('name');
  useEffect(() => {
    if (slugTouchedRef.current) return;
    form.setValue('slug', nameValue ? slugify(String(nameValue)) : '', { shouldDirty: false });
  }, [form, nameValue]);

  const handleSubmit = form.handleSubmit(async (data) => {
    const result = isEditMode ? await update({ ...data, id: initialData?.id ?? '' }) : await create(data);

    if (result?.data && 'fieldErrors' in result.data && result.data.fieldErrors) {
      for (const [field, message] of Object.entries(result.data.fieldErrors)) {
        form.setError(field as keyof FaqCategoryFormData, { type: 'server', message: message as string });
      }
      return;
    }
    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    toast.success(isEditMode ? t('updated') : t('created'));
    if (!isEditMode) {
      form.reset({ name: '', slug: '' });
      slugTouchedRef.current = false;
    }
    onSuccess?.();
  });

  return (
    <Form {...form}>
      <form
        className="space-y-3"
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
        <FaqCategoryFormFields
          labels={{
            name: t('name'),
            namePlaceholder: t('namePlaceholder'),
            slug: t('slug'),
          }}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={isCreating || isUpdating}>
            {isEditMode ? tUi('save') : t('add')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
