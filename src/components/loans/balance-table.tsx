'use client';

import { ClipboardList, ClipboardPenLine, Coins, Layers, Receipt, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn, formatCurrency, formatPercentage } from '@/lib/utils';
import type { LenderWithCalculations } from '@/types/lenders';
import type { LoanWithCalculations } from '@/types/loans';

import { TRANSACTION_AMOUNT_CLASS, transactionIcon, transactionIconBackground } from './loan-balance-summary';

type BalanceTableProps = {
  totals: Pick<
    LoanWithCalculations,
    'deposits' | 'withdrawals' | 'notReclaimed' | 'interest' | 'interestPaid' | 'interestError' | 'balance'
  > &
    Partial<Pick<LenderWithCalculations, 'totalLoans' | 'activeLoans' | 'interestRate' | 'amount' | 'activeAmount'>>;
  /** 'full' = both blocks (default), 'statistics' = only totalLoans/activeLoans/amount/interestRate, 'sums' = only deposits/interest/withdrawals/balance */
  variant?: 'full' | 'statistics' | 'sums';
  className?: string;
};

const rowClass = 'flex items-center justify-between border-t px-0 py-1.5 first:border-t-0';

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
    activeAmount,
    interestRate,
    amount,
  },
  variant = 'full',
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

  const showTotalBorder =
    deposits !== 0 || withdrawals > 0 || interest > 0 || interestPaid !== 0 || notReclaimed > 0 || interestError > 0;

  /** Separator before transaction rows when statistics and sums blocks both render (full lender view). */
  const dividerBelowStatistics = variant === 'full' && showStatistics === true && showSums === true;

  return (
    <div className="space-y-0">
      {showStatistics && (
        <>
          <div className={rowClass}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="rounded-full bg-muted p-1">
                <Layers className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">{t('table.totalLoans')}</span>
            </div>
            <div className={TRANSACTION_AMOUNT_CLASS}>{totalLoans}</div>
          </div>
          <div className={rowClass}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="rounded-full bg-muted p-1">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">{t('table.activeLoans')}</span>
            </div>
            <div className={TRANSACTION_AMOUNT_CLASS}>{activeLoans}</div>
          </div>
          <div className={rowClass}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="rounded-full bg-muted p-1">
                <Coins className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">{t('table.amountTotal')}</span>
            </div>
            <div className={TRANSACTION_AMOUNT_CLASS}>{formatCurrency(amount)}</div>
          </div>
          <div className={rowClass}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="rounded-full bg-muted p-1">
                <ClipboardPenLine className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">{t('table.amountActive')}</span>
            </div>
            <div className={TRANSACTION_AMOUNT_CLASS}>{formatCurrency(activeAmount)}</div>
          </div>
          <div className={cn(rowClass, dividerBelowStatistics ? 'border-b pb-4' : undefined)}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className={cn('rounded-full p-1', transactionIconBackground('INTEREST'))}>
                {transactionIcon('INTEREST')}
              </div>
              <span className="text-sm font-medium">{t('table.interestRateAvg')}</span>
            </div>
            <div className={TRANSACTION_AMOUNT_CLASS}>{formatPercentage(interestRate)} %</div>
          </div>
        </>
      )}

      {showSums && deposits !== 0 && (
        <div className={cn(rowClass, showStatistics && 'pt-2')}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className={cn('rounded-full p-1', transactionIconBackground('DEPOSIT'))}>
              {transactionIcon('DEPOSIT')}
            </div>
            <span className="text-sm font-medium">{t('table.deposits')}</span>
          </div>
          <div className={cn(TRANSACTION_AMOUNT_CLASS, 'text-success-foreground')}>+{formatCurrency(deposits)}</div>
        </div>
      )}
      {showSums && interest !== 0 && (
        <div className={rowClass}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className={cn('rounded-full p-1', transactionIconBackground('INTEREST'))}>
              {transactionIcon('INTEREST')}
            </div>
            <span className="text-sm font-medium">{t('table.interest')}</span>
          </div>
          <div className={cn(TRANSACTION_AMOUNT_CLASS, 'text-success-foreground')}>+{formatCurrency(interest)}</div>
        </div>
      )}
      {showSums && interestPaid !== 0 && (
        <div className={rowClass}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className={cn('rounded-full p-1', transactionIconBackground('INTERESTPAYMENT'))}>
              {transactionIcon('INTERESTPAYMENT')}
            </div>
            <span className="text-sm font-medium">{t('table.interestPaid')}</span>
          </div>
          <div className={cn(TRANSACTION_AMOUNT_CLASS, 'text-info-foreground')}>{formatCurrency(interestPaid)}</div>
        </div>
      )}
      {showSums && interestError !== 0 && (
        <div className={rowClass}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="rounded-full bg-warning/20 p-1">
              <Receipt className="h-4 w-4 text-warning-foreground" />
            </div>
            <span className="text-sm font-medium">{t('table.interestError')}</span>
          </div>
          <div className={cn(TRANSACTION_AMOUNT_CLASS, 'text-warning-foreground')}>
            {interestError < 0 ? '-' : ''}
            {formatCurrency(interestError)}
          </div>
        </div>
      )}
      {showSums && withdrawals !== 0 && (
        <div className={rowClass}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className={cn('rounded-full p-1', transactionIconBackground('WITHDRAWAL'))}>
              {transactionIcon('WITHDRAWAL')}
            </div>
            <span className="text-sm font-medium">{t('table.withdrawals')}</span>
          </div>
          <div className={cn(TRANSACTION_AMOUNT_CLASS, 'text-info-foreground')}>{formatCurrency(withdrawals)}</div>
        </div>
      )}
      {showSums && notReclaimed !== 0 && (
        <div className={rowClass}>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className={cn('rounded-full p-1', transactionIconBackground('WITHDRAWAL'))}>
              {transactionIcon('WITHDRAWAL')}
            </div>
            <span className="text-sm font-medium">{t('table.notReclaimed')}</span>
          </div>
          <div className={cn(TRANSACTION_AMOUNT_CLASS, 'text-blue-600')}>{formatCurrency(notReclaimed)}</div>
        </div>
      )}
      {showSums && (
        <div
          className={cn(
            'flex items-center justify-between px-0 py-1.5',
            showTotalBorder ? 'mt-2 border-t pt-2' : 'border-t first:border-t-0',
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="rounded-full bg-muted p-1">
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-bold">{t('table.balance')}</span>
          </div>
          <div className={cn(TRANSACTION_AMOUNT_CLASS, 'text-sm font-bold text-foreground')}>
            {formatCurrency(balance ?? 0)}
          </div>
        </div>
      )}
    </div>
  );
}
