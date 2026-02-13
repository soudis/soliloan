'use client';

import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import { cn, formatCurrency, formatPercentage } from '@/lib/utils';
import { useLenderLoanSelectionStore } from '@/store/lender-loan-selection-store';
import type { LoanWithCalculations } from '@/types/loans';
import { LoanStatusBadge } from '../loans/loan-status-badge';

interface LoanSelectorItemRowProps {
  loan: LoanWithCalculations;
  highlightActive?: boolean;
}

export function LoanSelectorItemRow({ loan, highlightActive = true }: LoanSelectorItemRowProps) {
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;
  const tCommon = useTranslations('common');
  const tLoan = useTranslations('dashboard.loans');
  const { getSelectedLoanId } = useLenderLoanSelectionStore();

  const amountStr = formatCurrency(loan.amount);
  const interestRateStr = `${formatPercentage(loan.interestRate)}%`;
  const balanceStr = formatCurrency(loan.balance);
  const contractDateStr = format(loan.signDate, 'PPP', {
    locale: dateLocale,
  });

  const loanNumberAndBadgeCell = (
    <div className="align-middle p-2 pl-3 table-cell min-w-35">
      <div className="flex flex-col items-start gap-1">
        <h3 className="text-lg font-medium">#{loan.loanNumber}</h3>
        <LoanStatusBadge status={loan.status} className="mt-0.5" />
      </div>
    </div>
  );

  const detailsCell = (
    <div className="align-middle p-2 pr-3 border-l border-border table-cell">
      <div className="text-left flex flex-col justify-center">
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
    </div>
  );

  return (
    <div
      className={cn(
        'border-b border-border w-full',
        getSelectedLoanId(loan.lender.id) === loan.id && highlightActive && 'bg-muted',
      )}
    >
      {loanNumberAndBadgeCell}
      {detailsCell}
    </div>
  );
}
