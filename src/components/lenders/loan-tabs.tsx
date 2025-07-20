'use client';

import type { getLenderById } from '@/actions/lenders';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter } from '@/i18n/navigation';
import type { LenderWithCalculations } from '@/types/lenders';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';
import { LoanSelectorItem } from './loan-selector-item';

type LoanInSelector = NonNullable<Awaited<ReturnType<typeof getLenderById>>['lender']>['loans'][0];

interface LoanTabsProps {
  loans: LoanInSelector[];
  lender: LenderWithCalculations;
  selectedLoanId?: string;
  onSelectLoan: (loanId: string) => void;
}

export function LoanTabs({ loans, selectedLoanId, onSelectLoan, lender }: LoanTabsProps) {
  const tCommon = useTranslations('common');
  const router = useRouter();
  return (
    <Tabs value={selectedLoanId} onValueChange={onSelectLoan} className="w-full ">
      <TabsList className="flex flex-row flex-wrap justify-start gap-6 p-0 bg-transparent h-auto border-0 mt-0">
        {loans.map((loan) => (
          <TabsTrigger
            key={loan.id}
            value={loan.id}
            className="relative flex flex-col items-start justify-start h-auto rounded-xl p-3 transition-all duration-200 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 text-muted-foreground data-[state=active]:text-foreground border border-border bg-card hover:bg-muted data-[state=active]:bg-muted/30 data-[state=active]:border-primary/50  cursor-pointer flex-grow sm:flex-grow-0 sm:min-w-[180px]"
          >
            <LoanSelectorItem loan={loan} />
          </TabsTrigger>
        ))}
        <div className="flex items-center ">
          <Button
            size="lg"
            variant="outline"
            className="h-full min-h-21 rounded-xl"
            onClick={() => router.push(`/loans/new?lenderId=${lender.id}`)}
          >
            <Plus />
            {tCommon('terms.loan')}
          </Button>
        </div>
      </TabsList>
    </Tabs>
  );
}
