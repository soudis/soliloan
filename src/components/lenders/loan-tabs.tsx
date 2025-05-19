'use client';

import type { getLenderById } from '@/app/actions/lenders';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { useTranslations } from 'next-intl';
import { LoanSelectorItem } from './loan-selector-item';

type LoanInSelector = NonNullable<Awaited<ReturnType<typeof getLenderById>>['lender']>['loans'][0];

interface LoanTabsProps {
  loans: LoanInSelector[];
  selectedLoanId?: string;
  onSelectLoan: (loanId: string) => void;
  commonT: ReturnType<typeof useTranslations<string>>;
  loanT: ReturnType<typeof useTranslations<string>>;
}

export function LoanTabs({ loans, selectedLoanId, onSelectLoan, commonT, loanT }: LoanTabsProps) {
  return (
    <Tabs value={selectedLoanId} onValueChange={onSelectLoan} className="w-full">
      <TabsList className="flex flex-row flex-wrap justify-start gap-3 p-0 bg-transparent mb-4 h-auto">
        {loans.map((loan) => (
          <TabsTrigger
            key={loan.id}
            value={loan.id}
            className="relative flex flex-col items-start justify-start h-auto rounded-xl p-3 transition-all duration-200 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 text-muted-foreground data-[state=active]:text-foreground border border-border bg-card hover:bg-muted data-[state=active]:bg-muted data-[state=active]:border-primary  cursor-pointer flex-grow sm:flex-grow-0 sm:min-w-[180px]"
          >
            <LoanSelectorItem loan={loan} commonT={commonT} loanT={loanT} />
          </TabsTrigger>
        ))}
      </TabsList>
      {/* The selected LoanCard will be rendered by the parent component */}
    </Tabs>
  );
}
