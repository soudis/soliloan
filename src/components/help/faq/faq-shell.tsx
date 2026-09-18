'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { HelpSearch } from '@/components/help/help-search';
import { ActionButton } from '@/components/ui/action-button';
import { useRouter } from '@/i18n/navigation';
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
  const router = useRouter();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-6 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <HelpSearch primary="faq" />
          {isAdmin ? (
            <>
              <FaqCategoryDialog categories={toc.categories} />
              <ActionButton
                intent="add"
                density="header"
                icon={<Plus className="h-4 w-4" />}
                label={t('newArticle')}
                onClick={() => router.push('/help/faq/new')}
              />
            </>
          ) : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <FaqTocNav toc={toc} isAdmin={isAdmin} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="max-w-3xl py-2 md:py-1 md:pl-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
