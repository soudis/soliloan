'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';

interface InfoTextMoreProps {
  children: ReactNode;
}

export function InfoTextMore({ children }: InfoTextMoreProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('common.infoText');

  const handleToggle = () => setOpen((prev) => !prev);

  return (
    <span className="text-inherit">
      <br />
      {open && <span className="mt-1 block whitespace-pre-line">{children}</span>}
      <button
        type="button"
        onClick={handleToggle}
        className="mt-1 inline-flex cursor-pointer items-center gap-1 appearance-none border-0 bg-transparent p-0 text-primary hover:text-primary/80"
      >
        {open ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden />
        )}
        {open ? t('less') : t('more')}
      </button>
    </span>
  );
}
