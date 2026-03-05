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
  /** 'full' = both blocks (default), 'statistics' = only totalLoans/activeLoans/amount/interestRate, 'sums' = only deposits/interest/withdrawals/balance */
  variant?: 'full' | 'statistics' | 'sums';
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
  variant = 'full',
  className = '',
}: BalanceTableProps) {
  const t = useTranslations('dashboard.loans');

  const showStatistics = (variant === 'full' || variant === 'statistics') && totalLoans !== undefined;
  const showSums =
    variant === 'full' ||
    (variant === 'sums' &&
      (deposits !== 0 ||
        withdrawals !== 0 ||
        interest !== 0 ||
        interestPaid !== 0 ||
        interestError !== 0 ||
        notReclaimed !== 0 ||
        balance !== undefined));

  return (
    <div className={`border rounded-md p-4 bg-muted/30 ${className}`}>
      <div className="grid grid-cols-1 gap-2">
        {showStatistics && (
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
        {showSums && (
          <>
            {deposits !== 0 && (
              <div className={cn('flex justify-between', showStatistics && 'pt-2')}>
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
                <span className="font-mono">{formatCurrency(balance ?? 0)}</span>
              </div>
            ) : (
              <div className="flex justify-between font-medium ">
                <span>{t('table.balance')}</span>
                <span className="font-mono">{formatCurrency(balance ?? 0)}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
