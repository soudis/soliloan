'use client';

import { Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import type { LenderDetailsWithCalculations } from '@/types/lenders';
import { AddTypeButton } from './add-entity-menu';
import { LoanAccordionCard } from './loan-accordion-card';

interface LenderLoansSectionProps {
  lender: LenderDetailsWithCalculations;
}

export function LenderLoansSection({ lender }: LenderLoansSectionProps) {
  const commonT = useTranslations('common');
  const t = useTranslations('dashboard.lenders.lenderPage');
  const router = useRouter();

  const autoExpand = lender.loans.length <= 2;

  return (
    <div id="loans" className="scroll-mt-24">
      <div className="flex flex-col gap-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">
              {t('sections.loans')}
              {lender.loans.length > 0 && <span className="ml-1.5 text-xs">({lender.loans.length})</span>}
            </h3>
          </div>
          <AddTypeButton
            label={commonT('terms.loan')}
            onClick={() => router.push(`/loans/new?lenderId=${lender.id}`)}
          />
        </div>

        {lender.loans.length === 0 && <p className="text-sm text-muted-foreground">{commonT('terms.noLoans')}</p>}

        {lender.loans.map((loan) => (
          <LoanAccordionCard key={loan.id} loan={loan} defaultOpen={autoExpand} />
        ))}
      </div>
    </div>
  );
}
