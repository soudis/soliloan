'use client';

import { useTranslations } from 'next-intl';

import { cn, formatCurrency, formatPercentage } from '@/lib/utils';
import type { LenderWithCalculations } from '@/types/lenders';
import type { LoanWithCalculations } from '@/types/loans';

type BalanceTableProps = {
  totals: Pick<
    LoanWithCalculations,
    'deposits' | 'withdrawals' | 'notReclaimed' | 'interest' | 'interestPaid' | 'interestError' | 'balance'
  > &
    Partial<Pick<LenderWithCalculations, 'totalLoans' | 'activeLoans' | 'interestRate' | 'amount'>>;
  className?: string;
};

export function BalanceTable({
  totals: {
    deposits,
    withdrawals,
    notReclaimed,
    interest,
    interestPaid,
    interestError,
    balance,
    totalLoans,
    activeLoans,
    interestRate,
    amount,
  },
  className = '',
}: BalanceTableProps) {
  const t = useTranslations('dashboard.loans');

  return (
    <div className={`border rounded-md p-4 bg-muted/30 ${className}`}>
      <div className="grid grid-cols-1 gap-2">
        {totalLoans !== undefined && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('table.totalLoans')}</span>
              <span className="font-medium font-mono">{totalLoans}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('table.activeLoans')}</span>
              <span className="font-medium font-mono">{activeLoans}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('table.amountTotal')}</span>
              <span className="font-medium font-mono">{formatCurrency(amount)}</span>
            </div>
            <div className="flex justify-between border-b pb-4">
              <span className="text-muted-foreground">{t('table.interestRateAvg')}</span>
              <span className="font-medium font-mono">{formatPercentage(interestRate)} %</span>
            </div>
          </>
        )}
        {deposits !== 0 && (
          <div className={cn('flex justify-between', totalLoans !== undefined && 'pt-2')}>
            <span className="text-muted-foreground">{t('table.deposits')}</span>
            <span className="font-medium text-green-600 font-mono">+{formatCurrency(deposits)}</span>
          </div>
        )}
        {interest !== 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('table.interest')}</span>
            <span className="font-medium text-green-600 font-mono">+{formatCurrency(interest)}</span>
          </div>
        )}
        {interestPaid !== 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('table.interestPaid')}</span>
            <span className="font-medium text-blue-600 font-mono">{formatCurrency(interestPaid)}</span>
          </div>
        )}
        {interestError !== 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('table.interestError')}</span>
            <span className="font-medium text-amber-600 font-mono">
              {interestError < 0 ? '-' : ''}
              {formatCurrency(interestError)}
            </span>
          </div>
        )}

        {withdrawals !== 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('table.withdrawals')}</span>
            <span className="font-medium text-blue-600 font-mono">{formatCurrency(withdrawals)}</span>
          </div>
        )}
        {notReclaimed !== 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('table.notReclaimed')}</span>
            <span className="font-medium text-blue-600 font-mono">{formatCurrency(notReclaimed)}</span>
          </div>
        )}
        {deposits !== 0 ||
        withdrawals > 0 ||
        interest > 0 ||
        interestPaid !== 0 ||
        notReclaimed > 0 ||
        interestError > 0 ? (
          <div className="border-t pt-2 mt-2 flex justify-between font-medium">
            <span>{t('table.balance')}</span>
            <span className="font-mono">{formatCurrency(balance)}</span>
          </div>
        ) : (
          <div className="flex justify-between font-medium ">
            <span>{t('table.balance')}</span>
            <span className="font-mono">{formatCurrency(0)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
