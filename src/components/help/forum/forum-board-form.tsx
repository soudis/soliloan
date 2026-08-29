'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createForumBoardAction, updateForumBoardAction } from '@/actions/help';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { slugify } from '@/lib/help/slugify';
import { type ForumBoardFormData, forumBoardFormSchema } from '@/lib/schemas/forum';
import type { ForumBoardRecord, ForumManagerOption } from '@/types/forum';

import { ForumBoardFormFields } from './forum-board-form-fields';

type ForumBoardFormProps = {
  initialData?: Pick<ForumBoardRecord, 'id' | 'name' | 'slug' | 'description' | 'moderatorIds'>;
  managers: ForumManagerOption[];
  onSuccess?: () => void;
};

export function ForumBoardForm({ initialData, managers, onSuccess }: ForumBoardFormProps) {
  const t = useTranslations('help.boardDialog');
  const tUi = useTranslations('common.ui.actions');
  const isEditMode = Boolean(initialData?.id);
  const slugTouchedRef = useRef(isEditMode);

  const { executeAsync: create, isExecuting: isCreating } = useAction(createForumBoardAction);
  const { executeAsync: update, isExecuting: isUpdating } = useAction(updateForumBoardAction);

  const form = useForm({
    resolver: zodResolver(forumBoardFormSchema),
    defaultValues: {
      name: initialData?.name ?? '',
      slug: initialData?.slug ?? '',
      description: initialData?.description ?? '',
      moderatorIds: initialData?.moderatorIds ?? [],
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
        form.setError(field as keyof ForumBoardFormData, { type: 'server', message: message as string });
      }
      return;
    }
    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    toast.success(isEditMode ? t('updated') : t('created'));
    if (!isEditMode) {
      form.reset({ name: '', slug: '', description: '', moderatorIds: [] });
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
          event.stopPropagation();
          void handleSubmit();
        }}
        onChange={(event) => {
          const target = event.target;
          if (target instanceof HTMLInputElement && target.name === 'slug') {
            slugTouchedRef.current = true;
          }
        }}
      >
        <ForumBoardFormFields
          managers={managers}
          labels={{
            name: t('name'),
            namePlaceholder: t('namePlaceholder'),
            slug: t('slug'),
            descriptionLabel: t('descriptionLabel'),
            descriptionPlaceholder: t('descriptionPlaceholder'),
            moderators: t('moderators'),
            moderatorsPlaceholder: t('moderatorsPlaceholder'),
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
