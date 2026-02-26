'use client';

import { BarChart3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import type { LenderWithCalculations } from '@/types/lenders';
import { SectionCard } from '../generic/section-card';

interface LenderFinancialsSectionProps {
  lender: LenderWithCalculations;
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
        {/* Statistics table */}
        {hasStats && (
          <SectionCard
            title={t('table.statistics')}
            icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="border rounded-md p-4 bg-muted/30">
              <div className="grid grid-cols-1 gap-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('table.totalLoans')}</span>
                  <span className="font-medium font-mono">{lender.totalLoans}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('table.activeLoans')}</span>
                  <span className="font-medium font-mono">{lender.activeLoans}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('table.amountTotal')}</span>
                  <span className="font-medium font-mono">{formatCurrency(lender.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('table.interestRateAvg')}</span>
                  <span className="font-medium font-mono">{formatPercentage(lender.interestRate)} %</span>
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Transaction sums table */}
        {hasTransactionData && (
          <SectionCard
            title={t('table.balance')}
            icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="border rounded-md p-4 bg-muted/30">
              <div className="grid grid-cols-1 gap-2">
                {lender.deposits !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('table.deposits')}</span>
                    <span className="font-medium text-green-600 font-mono">+{formatCurrency(lender.deposits)}</span>
                  </div>
                )}
                {lender.interest !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('table.interest')}</span>
                    <span className="font-medium text-green-600 font-mono">+{formatCurrency(lender.interest)}</span>
                  </div>
                )}
                {lender.interestPaid !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('table.interestPaid')}</span>
                    <span className="font-medium text-blue-600 font-mono">{formatCurrency(lender.interestPaid)}</span>
                  </div>
                )}
                {lender.interestError !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('table.interestError')}</span>
                    <span className="font-medium text-amber-600 font-mono">
                      {lender.interestError < 0 ? '-' : ''}
                      {formatCurrency(lender.interestError)}
                    </span>
                  </div>
                )}
                {lender.withdrawals !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('table.withdrawals')}</span>
                    <span className="font-medium text-blue-600 font-mono">{formatCurrency(lender.withdrawals)}</span>
                  </div>
                )}
                {lender.notReclaimed !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('table.notReclaimed')}</span>
                    <span className="font-medium text-blue-600 font-mono">{formatCurrency(lender.notReclaimed)}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2 flex justify-between font-medium">
                  <span>{t('table.balance')}</span>
                  <span className="font-mono">{formatCurrency(lender.balance)}</span>
                </div>
              </div>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
