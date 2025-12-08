'use client';

import { useRouter } from '@/i18n/navigation';
import { getLenderName } from '@/lib/utils';
import { useLenderLoanSelectionStore } from '@/store/lender-loan-selection-store';
import { type LenderTabValue, useLenderTabsStore } from '@/store/lender-tabs-store';
import type { LenderWithCalculations } from '@/types/lenders';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

import { Files } from '../generic/files';
import { Notes } from '../generic/notes';
import { LenderInfoCard } from './lender-info-card';
import { LenderLoansTab } from './lender-loans-tab';

type Props = {
  lender: LenderWithCalculations;
};

export const LenderPage = ({ lender }: Props) => {
  const t = useTranslations('dashboard.lenders.lenderPage');
  const commonT = useTranslations('common');
  const { getActiveTab, setActiveTab } = useLenderTabsStore();

  const searchParams = useSearchParams();
  const { getSelectedLoanId, setSelectedLoanId } = useLenderLoanSelectionStore();
  const [initialized, setInitialized] = useState(false);
  const activeTab = getActiveTab(lender.id);
  const router = useRouter();

  const loanId = searchParams.get('loanId');

  useEffect(() => {
    if (loanId && lender && !initialized && router) {
      setSelectedLoanId(lender.id, loanId);
      setActiveTab(lender.id, 'loans');
      setInitialized(true);
      router.replace(`/lenders/${lender.id}`);
    }
  }, [lender, loanId, setSelectedLoanId, setActiveTab, initialized, router]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(lender.id, value as LenderTabValue)}
      className="mt-6"
    >
      <TabsList>
        <div className="mb-9 mr-10">
          <h1 className="text-3xl font-bold whitespace-nowrap">{getLenderName(lender)}</h1>
          <p className="text-muted-foreground text-sm whitespace-nowrap">
            {commonT('terms.lenderNumber', { number: lender.lenderNumber })} ·{' '}
            {commonT('terms.loanCount', { count: lender.loans.length })}
          </p>
        </div>
        <div className="flex flex-row gap-4 overflow-x-auto">
          <TabsTrigger value="lender">{t('tabs.lender')}</TabsTrigger>
          <TabsTrigger value="loans">{t('tabs.loans')}</TabsTrigger>
          <TabsTrigger value="files">
            {t('tabs.files')}
            {lender.files && lender.files.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {lender.files.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes">
            {t('tabs.notes')}
            {lender.notes && lender.notes.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {lender.notes.length}
              </Badge>
            )}
          </TabsTrigger>
        </div>
      </TabsList>
      <TabsContent value="lender">
        <LenderInfoCard lender={lender} />
      </TabsContent>
      <TabsContent value="loans">
        <LenderLoansTab lender={lender} />
      </TabsContent>
      <TabsContent value="files">
        <Files lenderId={lender.id} loans={lender.loans} files={lender.files} />
      </TabsContent>
      <TabsContent value="notes">
        <Notes notes={lender.notes} lenderId={lender.id} loans={lender.loans} />
      </TabsContent>
    </Tabs>
  );
};
