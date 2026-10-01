'use client';

import { useTranslations } from 'next-intl';
import { parseAsStringLiteral, useQueryState } from 'nuqs';

import { YearlyInterestTab } from '@/components/processes/yearly-interest-tab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TABS = ['yearly-interest'] as const;

export function ProcessesPage() {
  const t = useTranslations('processes');
  const [tab, setTab] = useQueryState('tab', parseAsStringLiteral(TABS).withDefault('yearly-interest'));

  return (
    <Tabs value={tab} onValueChange={(value) => void setTab(value as (typeof TABS)[number])}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
      </div>
      <TabsList variant="modern">
        <TabsTrigger value="yearly-interest" variant="modern">
          <span>{t('tabs.yearlyInterest')}</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="yearly-interest" className="mt-6">
        <YearlyInterestTab />
      </TabsContent>
    </Tabs>
  );
}
