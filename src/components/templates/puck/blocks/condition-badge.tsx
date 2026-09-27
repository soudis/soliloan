'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { isActiveTemplateCondition } from '@/lib/templates/template-condition';

export function WithConditionBadge({ showIf, children }: { showIf?: unknown; children: ReactNode }) {
  const t = useTranslations('templates.editor.conditions');
  if (!isActiveTemplateCondition(showIf)) return children;
  return (
    <div className="flex w-full flex-col">
      <div className="flex shrink-0 items-center border-b border-border/70 bg-muted/60 px-2 py-[3px]">
        <span className="font-mono text-[9px] leading-tight tracking-tight text-muted-foreground">{t('badge')}</span>
      </div>
      {children}
    </div>
  );
}
