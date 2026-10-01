'use client';

import { RichTextMenu } from '@puckeditor/core';
import type { Editor } from '@tiptap/core';
import { GitBranch } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function TemplateConditionMenuControl({ editor }: { editor: Editor | null }) {
  const t = useTranslations('templates.editor.conditions');

  return (
    <RichTextMenu.Control
      title={t('insert')}
      icon={<GitBranch className="h-4 w-4" />}
      onClick={() => {
        editor
          ?.chain()
          .focus()
          .insertTemplateCondition({ thenText: t('thenPlaceholder'), elseText: t('elsePlaceholder') })
          .run();
      }}
    />
  );
}
