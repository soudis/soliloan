'use client';

import { formatCurrency, formatDate, formatPercentage } from '@/lib/utils';
import type { LoanWithCalculations } from '@/types/loans';

import { useLocale, useTranslations } from 'next-intl';
import { LoanStatusBadge } from '../loans/loan-status-badge';

interface LoanSelectorItemProps {
  loan: LoanWithCalculations;
}

export function LoanSelectorItem({ loan }: LoanSelectorItemProps) {
  const locale = useLocale();
  const tCommon = useTranslations('common');
  const tLoan = useTranslations('dashboard.loans');
  const amountStr = formatCurrency(loan.amount);
  const interestRateStr = `${formatPercentage(loan.interestRate)}%`;
  const balanceStr = formatCurrency(loan.balance);
  const contractDateStr = formatDate(loan.signDate, locale);

  const loanNumberAndBadge = (
    <div className="flex flex-col items-start flex-shrink-0 gap-1 min-w-30">
      <h3 className="text-lg font-medium">
        {tLoan('table.loanNumberShort')} #{loan.loanNumber}
      </h3>
      <LoanStatusBadge status={loan.status} className="mt-0.5" />
    </div>
  );

  const details = (
    <div className="text-left flex-grow flex flex-col justify-center">
      <div className="text-sm font-medium text-primary mb-1">{contractDateStr}</div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        <div>
          <span className="font-medium text-foreground">{amountStr}</span> {tCommon('terms.atRate')}{' '}
          <span className="font-medium text-foreground">{interestRateStr}</span>
        </div>
        <div>
          {tLoan('table.balanceShort')} <span className="font-medium text-foreground">{balanceStr}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex items-stretch justify-start w-full py-2">
      {loanNumberAndBadge}
      <div className="border-l border-border mx-2 self-stretch" />
      {details}
    </div>
  );
}
