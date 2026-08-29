'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { FaqToc } from '@/types/faq';

import { FaqCategoryDialog } from './faq-category-dialog';
import { FaqTocNav } from './faq-toc-nav';

type FaqShellProps = {
  toc: FaqToc;
  isAdmin: boolean;
  children: ReactNode;
};

export function FaqShell({ toc, isAdmin, children }: FaqShellProps) {
  const t = useTranslations('help.faqPage');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        {isAdmin ? (
          <div className="flex flex-wrap gap-2">
            <FaqCategoryDialog categories={toc.categories} />
            {toc.categories.length > 0 ? (
              <Button asChild size="sm">
                <Link href="/help/faq/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('newArticle')}
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card md:flex-row">
        <FaqTocNav toc={toc} isAdmin={isAdmin} />
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
