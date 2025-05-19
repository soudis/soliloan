'use client';

import { formatCurrency, formatPercentage } from '@/lib/utils';
import type { LoanWithCalculations } from '@/types/loans';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import type { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { LoanStatusBadge } from './loan-status-badge';

interface LoanSelectorItemProps {
  loan: LoanWithCalculations;
  commonT: ReturnType<typeof useTranslations<string>>;
  loanT: ReturnType<typeof useTranslations<string>>;
}

export function LoanSelectorItem({ loan, commonT, loanT }: LoanSelectorItemProps) {
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;

  const amountStr = formatCurrency(loan.amount);
  const interestRateStr = `${formatPercentage(loan.interestRate)}%`;
  const balanceStr = formatCurrency(loan.balance);
  const contractDateStr = format(loan.signDate, 'PPP', {
    locale: dateLocale,
  });

  const loanNumberAndBadge = (
    <div className="flex flex-col items-start flex-shrink-0 gap-1">
      <h3 className="text-lg font-medium">
        {loanT('table.loanNumberShort')} #{loan.loanNumber}
      </h3>
      <LoanStatusBadge status={loan.status} commonT={commonT} className="mt-0.5" />
    </div>
  );

  const details = (
    <div className="text-left flex-grow flex flex-col justify-center">
      <div className="text-sm font-medium text-primary mb-1">{contractDateStr}</div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        <div>
          <span className="font-medium text-foreground">{amountStr}</span> {commonT('terms.atRate')}{' '}
          <span className="font-medium text-foreground">{interestRateStr}</span>
        </div>
        <div>
          {loanT('table.balanceShort')} <span className="font-medium text-foreground">{balanceStr}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex items-stretch justify-start w-full">
      {loanNumberAndBadge}
      <div className="border-l border-border mx-2 self-stretch" />
      {details}
    </div>
  );
}
