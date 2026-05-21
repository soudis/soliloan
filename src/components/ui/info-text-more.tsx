'use client';

import { useTranslations } from 'next-intl';
import { type KeyboardEvent, type ReactNode, useState } from 'react';

import { cn } from '@/lib/utils';

interface InfoTextMoreProps {
  children: ReactNode;
}

export function InfoTextMore({ children }: InfoTextMoreProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('common.infoText');

  const handleToggle = () => setOpen((prev) => !prev);

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

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
      <span
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={cn(
          'inline cursor-pointer text-foreground underline-offset-4 hover:underline',
          open && 'ml-1',
        )}
      >
        {open ? t('less') : t('more')}
      </span>
    </span>
  );
}
