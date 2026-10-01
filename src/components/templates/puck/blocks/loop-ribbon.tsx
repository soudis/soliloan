'use client';

import { useTranslations } from 'next-intl';
import { useMergeTagConfig } from '../../merge-tag-context';

export function LoopRibbon({ loopKey }: { loopKey: string }) {
  const config = useMergeTagConfig();
  if (!loopKey.trim()) return null;
  const label = config?.loops.find((loop) => loop.key === loopKey)?.label ?? loopKey;

  return (
    <div className="flex shrink-0 items-center border-b border-border/70 bg-muted/60 px-2 py-[3px]">
      <span className="truncate font-sans text-[10px] leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}

export function LoopRibbonEnd({ loopKey }: { loopKey: string }) {
  const t = useTranslations('templates.editor.loopRibbon');
  if (!loopKey.trim()) return null;

  return (
    <div className="shrink-0 border-t border-border/70 bg-muted/60 px-2 py-[3px] text-right">
      <span className="font-sans text-[10px] leading-tight text-muted-foreground">{t('end')}</span>
    </div>
  );
}
