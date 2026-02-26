'use client';

import { Plus, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useProjectId } from '@/lib/hooks/use-project-id';
import type { LenderWithCalculations } from '@/types/lenders';
import { Button } from '../ui/button';
import { LoanAccordionCard } from './loan-accordion-card';

interface LenderLoansSectionProps {
  lender: LenderWithCalculations;
}

export function LenderLoansSection({ lender }: LenderLoansSectionProps) {
  const commonT = useTranslations('common');
  const t = useTranslations('dashboard.lenders.lenderPage');
  const router = useRouter();
  const projectId = useProjectId();

  const autoExpand = lender.loans.length <= 2;

  return (
    <div id="loans" className="scroll-mt-24">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            {t('sections.loans')}
            {lender.loans.length > 0 && <span className="ml-1.5 text-xs">({lender.loans.length})</span>}
          </h3>
        </div>
        {lender.loans.map((loan) => (
          <LoanAccordionCard key={loan.id} loan={loan} defaultOpen={autoExpand} />
        ))}

        <Button
          variant="outline"
          className="w-full border-dashed py-6"
          onClick={() => router.push(`/${projectId}/loans/new?lenderId=${lender.id}`)}
        >
          <Plus className="h-5 w-5 mr-2" />
          {commonT('terms.loan')}
        </Button>
      </div>
    </div>
  );
}
