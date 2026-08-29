'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createForumThreadAction } from '@/actions/help';
import { Form } from '@/components/ui/form';
import { FormActions } from '@/components/ui/form-actions';
import { useRouter } from '@/i18n/navigation';
import { EMPTY_FAQ_DOC } from '@/lib/help/faq-constants';
import { forumThreadFormSchema } from '@/lib/schemas/forum';
import { serializeRichTextBody } from '@/lib/schemas/rich-text';
import type { FaqTocArticle } from '@/types/faq';

import { ForumThreadFormFields } from './forum-thread-form-fields';

type ForumThreadFormProps = {
  boardId: string;
  boardSlug: string;
  pickerArticles: Pick<FaqTocArticle, 'title' | 'slug'>[];
};

export function ForumThreadForm({ boardId, boardSlug, pickerArticles }: ForumThreadFormProps) {
  const t = useTranslations('help.threadForm');
  const tUi = useTranslations('common.ui.actions');
  const router = useRouter();
  const { executeAsync, isExecuting } = useAction(createForumThreadAction);

  const form = useForm({
    resolver: zodResolver(forumThreadFormSchema),
    defaultValues: {
      title: '',
      body: EMPTY_FAQ_DOC,
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    const result = await executeAsync({ ...data, boardId, body: serializeRichTextBody(data.body) });
    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }
    const threadId = result?.data && 'thread' in result.data ? result.data.thread.id : null;
    toast.success(t('created'));
    router.push(threadId ? `/help/forum/${boardSlug}/${threadId}` : `/help/forum/${boardSlug}`);
    router.refresh();
  });

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <ForumThreadFormFields
          pickerArticles={pickerArticles}
          labels={{
            title: t('title'),
            titlePlaceholder: t('titlePlaceholder'),
            body: t('body'),
          }}
        />
        <FormActions
          submitButtonText={tUi('create')}
          submittingButtonText={tUi('creating')}
          cancelButtonText={tUi('cancel')}
          isLoading={isExecuting}
          onCancel={() => router.push(`/help/forum/${boardSlug}`)}
        />
      </form>
    </Form>
  );
}
