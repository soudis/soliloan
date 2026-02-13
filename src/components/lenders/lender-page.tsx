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

import { Files as FilesIcon, NotebookPen, User, Wallet } from 'lucide-react';
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
  const activeTab = useLenderTabsStore((state) => state.activeTabs[lender.id] ?? 'lender');
  const setActiveTab = useLenderTabsStore((state) => state.setActiveTab);

  const searchParams = useSearchParams();
  const { getSelectedLoanId, setSelectedLoanId } = useLenderLoanSelectionStore();
  const [initialized, setInitialized] = useState(false);
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
      className="mt-0"
    >
      <div className="mb-6 mr-10">
        <h1 className="text-3xl font-bold whitespace-nowrap">{getLenderName(lender)}</h1>
        <p className="text-muted-foreground text-sm whitespace-nowrap">
          {commonT('terms.lenderNumber', { number: lender.lenderNumber })} ·{' '}
          {commonT('terms.loanCount', { count: lender.loans.length })}
        </p>
      </div>

      <TabsList variant="modern">
        <TabsTrigger value="lender" variant="modern">
          <User className="h-5 w-5 md:h-4 md:w-4" />
          <span>{t('tabs.lender')}</span>
        </TabsTrigger>
        <TabsTrigger value="loans" variant="modern">
          <div className="relative">
            <Wallet className="h-5 w-5 md:h-4 md:w-4" />
            {lender.loans && lender.loans.length > 0 && (
              <span className="absolute -top-2 -right-3 md:hidden flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[9px] border border-background">
                {lender.loans.length}
              </span>
            )}
          </div>
          <span>{t('tabs.loans')}</span>
          {lender.loans && lender.loans.length > 0 && (
            <Badge variant="secondary" className="ml-2 hidden md:inline-flex h-5 px-1.5">
              {lender.loans.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="files" variant="modern">
          <div className="relative">
            <FilesIcon className="h-5 w-5 md:h-4 md:w-4" />
            {lender.files && lender.files.length > 0 && (
              <span className="absolute -top-2 -right-3 md:hidden flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[9px] border border-background">
                {lender.files.length}
              </span>
            )}
          </div>
          <span>{t('tabs.files')}</span>
          {lender.files && lender.files.length > 0 && (
            <Badge variant="secondary" className="ml-2 hidden md:inline-flex h-5 px-1.5">
              {lender.files.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="notes" variant="modern">
          <div className="relative">
            <NotebookPen className="h-5 w-5 md:h-4 md:w-4" />
            {lender.notes && lender.notes.length > 0 && (
              <span className="absolute -top-2 -right-3 md:hidden flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[9px] border border-background">
                {lender.notes.length}
              </span>
            )}
          </div>
          <span>{t('tabs.notes')}</span>
          {lender.notes && lender.notes.length > 0 && (
            <Badge variant="secondary" className="ml-2 hidden md:inline-flex h-5 px-1.5">
              {lender.notes.length}
            </Badge>
          )}
        </TabsTrigger>
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
