'use client';

import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';

import { cn } from '@/lib/utils';

interface InfoTextMoreProps {
  children: ReactNode;
}

export function InfoTextMore({ children }: InfoTextMoreProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('common.infoText');

  const handleToggle = () => setOpen((prev) => !prev);

  return (
    <span className="inline">
      <span
        className={cn(
          'inline-grid align-baseline transition-[grid-template-rows] duration-200 ease-in-out motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <span className="min-h-0 overflow-hidden" aria-hidden={!open}>
          {open && ' '}
          {children}
        </span>
      </span>
      {open && <span className="block h-4" aria-hidden />}
      <button
        type="button"
        onClick={handleToggle}
        className="inline cursor-pointer appearance-none border-0 bg-transparent p-0 text-foreground underline-offset-4 hover:underline"
      >
        {open ? t('less') : t('more')}
      </button>
    </span>
  );
}
