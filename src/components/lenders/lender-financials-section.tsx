'use client';

import { BarChart3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BalanceTable } from '@/components/loans/balance-table';
import type { LenderDetailsWithCalculations } from '@/types/lenders';
import { SectionCard } from '../generic/section-card';

interface LenderFinancialsSectionProps {
  lender: LenderDetailsWithCalculations;
}

export function LenderFinancialsSection({ lender }: LenderFinancialsSectionProps) {
  const t = useTranslations('dashboard.loans');

  const hasStats = lender.totalLoans !== undefined;
  const hasTransactionData =
    lender.deposits !== 0 ||
    lender.withdrawals !== 0 ||
    lender.interest !== 0 ||
    lender.interestPaid !== 0 ||
    lender.interestError !== 0 ||
    lender.notReclaimed !== 0 ||
    lender.balance !== undefined;

  if (!hasStats && !hasTransactionData) return null;

  return (
    <div id="financials" className="scroll-mt-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hasStats && (
          <SectionCard title={t('table.statistics')} icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}>
            <BalanceTable totals={lender} variant="statistics" />
          </SectionCard>
        )}

        {hasTransactionData && (
          <SectionCard title={t('table.balance')} icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}>
            <BalanceTable totals={lender} variant="sums" />
          </SectionCard>
        )}
      </div>
    </div>
  );
}
