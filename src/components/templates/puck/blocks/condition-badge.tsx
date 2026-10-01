'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { useTemplateConditionSummary } from '@/components/templates/conditions/use-condition-summary';
import { isActiveTemplateCondition } from '@/lib/templates/template-condition';

export function WithConditionBadge({ showIf, children }: { showIf?: unknown; children: ReactNode }) {
  const t = useTranslations('templates.editor.conditions');
  const summary = useTemplateConditionSummary(showIf);
  if (!isActiveTemplateCondition(showIf)) return children;
  const text = summary ? `${t('badge')} ${summary}` : t('badge');
  return (
    <div className="flex w-full flex-col">
      <div className="flex shrink-0 items-start border-b border-border/70 bg-muted/60 px-2 py-1">
        <span className="font-sans text-[10px] leading-snug text-muted-foreground" title={text}>
          {text}
        </span>
      </div>
      {children}
    </div>
  );
}
