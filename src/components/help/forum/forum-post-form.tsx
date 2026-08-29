'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createForumPostAction, updateForumPostAction } from '@/actions/help';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useRouter } from '@/i18n/navigation';
import { EMPTY_FAQ_DOC } from '@/lib/help/faq-constants';
import { forumPostFormSchema } from '@/lib/schemas/forum';
import { serializeRichTextBody } from '@/lib/schemas/rich-text';
import type { FaqTocArticle } from '@/types/faq';

import { ForumPostFormFields } from './forum-post-form-fields';

type ForumPostFormProps = {
  pickerArticles: Pick<FaqTocArticle, 'title' | 'slug'>[];
  compact?: boolean;
  onCancel?: () => void;
} & (
  | { mode: 'reply'; threadId: string; parentId: string; initialBody?: never; postId?: never }
  | { mode: 'edit'; postId: string; initialBody: unknown; threadId?: never; parentId?: never }
);

export function ForumPostForm(props: ForumPostFormProps) {
  const { pickerArticles, compact = true, onCancel } = props;
  const t = useTranslations('help.postForm');
  const tPage = useTranslations('help.forumPage');
  const tUi = useTranslations('common.ui.actions');
  const router = useRouter();
  const { executeAsync: create, isExecuting: isCreating } = useAction(createForumPostAction);
  const { executeAsync: update, isExecuting: isUpdating } = useAction(updateForumPostAction);

  const form = useForm({
    resolver: zodResolver(forumPostFormSchema.pick({ body: true })),
    defaultValues: {
      body: props.mode === 'edit' ? (props.initialBody ?? EMPTY_FAQ_DOC) : EMPTY_FAQ_DOC,
    },
  });

  const isLoading = isCreating || isUpdating;

  const handleSubmit = form.handleSubmit(async (data) => {
    const body = serializeRichTextBody(data.body);
    const result =
      props.mode === 'edit'
        ? await update({ id: props.postId, body })
        : await create({ threadId: props.threadId, parentId: props.parentId, body });

    if (result?.serverError) {
      toast.error(result.serverError);
      return;
    }

    toast.success(props.mode === 'edit' ? tPage('saved') : tPage('posted'));
    if (props.mode === 'reply') {
      form.reset({ body: EMPTY_FAQ_DOC });
    }
    router.refresh();
    onCancel?.();
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
      >
        <ForumPostFormFields pickerArticles={pickerArticles} label={t('body')} compact={compact} />
        <div className="flex justify-end gap-2">
          {onCancel ? (
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
              {tUi('cancel')}
            </Button>
          ) : null}
          <Button type="submit" size="sm" disabled={isLoading}>
            {props.mode === 'edit' ? t('save') : t('submit')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
