'use client';

import type { Transaction } from '@prisma/client';
import { ArrowDownIcon, ArrowUpIcon, Percent, Receipt, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import type { LoanDetailsWithCalculations } from '@/types/loans';

/** Match data-table actions column (`w-9`); single … menu per row. */
export const TRANSACTION_ACTIONS_SLOT_CLASS = 'flex w-9 min-w-[2.25rem] shrink-0 justify-end';
export const TRANSACTION_AMOUNT_CLASS = 'min-w-[9rem] shrink-0 text-right font-medium font-mono text-sm tabular-nums';

export function transactionIcon(type: Transaction['type']) {
  switch (type) {
    case 'DEPOSIT':
      return <ArrowDownIcon className="h-4 w-4 text-green-500" />;
    case 'INTEREST':
      return <Percent className="h-4 w-4 text-green-500" />;
    case 'WITHDRAWAL':
    case 'INTERESTPAYMENT':
    case 'TERMINATION':
      return <ArrowUpIcon className="h-4 w-4 text-blue-500" />;
    default:
      return <Receipt className="h-4 w-4 text-gray-500" />;
  }
}

export function transactionIconBackground(type: Transaction['type']) {
  switch (type) {
    case 'DEPOSIT':
    case 'INTEREST':
      return 'bg-green-500/20';
    case 'WITHDRAWAL':
    case 'INTERESTPAYMENT':
    case 'TERMINATION':
      return 'bg-blue-500/20';
    default:
      return 'bg-gray-500/20';
  }
}

export type LoanBalanceSummaryProps = {
  loan: LoanDetailsWithCalculations;
  readOnly: boolean;
};

export function LoanBalanceSummary({ loan, readOnly }: LoanBalanceSummaryProps) {
  const t = useTranslations('dashboard.loans');
  const { deposits, withdrawals, notReclaimed, interest, interestPaid, interestError, balance } = loan;

  const showTotalBorder =
    deposits !== 0 || withdrawals > 0 || interest > 0 || interestPaid !== 0 || notReclaimed > 0 || interestError > 0;

  const rowClass = 'flex items-center justify-between rounded-md border-t px-2 py-1.5 first:border-t-0';

  function SummaryAmount({ className, children }: { className?: string; children: ReactNode }) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <div className={cn(TRANSACTION_AMOUNT_CLASS, className)}>{children}</div>
        {!readOnly && <div className={TRANSACTION_ACTIONS_SLOT_CLASS} aria-hidden />}
      </div>
    );
  }

  return (
    <div className="pt-0">
      <h4 className="text-sm font-medium text-muted-foreground mb-2 border-b pb-3">{t('table.totals')}</h4>
      <div className="space-y-0">
        {deposits !== 0 && (
          <div className={rowClass}>
            <div className="flex min-w-0 flex-1 items-center space-x-3">
              <div className={cn('rounded-full p-1', transactionIconBackground('DEPOSIT'))}>
                {transactionIcon('DEPOSIT')}
              </div>
              <span className="text-sm font-medium">{t('table.deposits')}</span>
            </div>
            <SummaryAmount className="text-green-600">+{formatCurrency(deposits)}</SummaryAmount>
          </div>
        )}
        {interest !== 0 && (
          <div className={rowClass}>
            <div className="flex min-w-0 flex-1 items-center space-x-3">
              <div className={cn('rounded-full p-1', transactionIconBackground('INTEREST'))}>
                {transactionIcon('INTEREST')}
              </div>
              <span className="text-sm font-medium">{t('table.interest')}</span>
            </div>
            <SummaryAmount className="text-green-600">+{formatCurrency(interest)}</SummaryAmount>
          </div>
        )}
        {interestPaid !== 0 && (
          <div className={rowClass}>
            <div className="flex min-w-0 flex-1 items-center space-x-3">
              <div className={cn('rounded-full p-1', transactionIconBackground('INTERESTPAYMENT'))}>
                {transactionIcon('INTERESTPAYMENT')}
              </div>
              <span className="text-sm font-medium">{t('table.interestPaid')}</span>
            </div>
            <SummaryAmount className="text-blue-600">{formatCurrency(interestPaid)}</SummaryAmount>
          </div>
        )}
        {interestError !== 0 && (
          <div className={rowClass}>
            <div className="flex min-w-0 flex-1 items-center space-x-3">
              <div className="rounded-full bg-amber-500/20 p-1">
                <Receipt className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-sm font-medium">{t('table.interestError')}</span>
            </div>
            <SummaryAmount className="text-amber-600">
              {interestError < 0 ? '-' : ''}
              {formatCurrency(interestError)}
            </SummaryAmount>
          </div>
        )}
        {withdrawals !== 0 && (
          <div className={rowClass}>
            <div className="flex min-w-0 flex-1 items-center space-x-3">
              <div className={cn('rounded-full p-1', transactionIconBackground('WITHDRAWAL'))}>
                {transactionIcon('WITHDRAWAL')}
              </div>
              <span className="text-sm font-medium">{t('table.withdrawals')}</span>
            </div>
            <SummaryAmount className="text-blue-600">{formatCurrency(withdrawals)}</SummaryAmount>
          </div>
        )}
        {notReclaimed !== 0 && (
          <div className={rowClass}>
            <div className="flex min-w-0 flex-1 items-center space-x-3">
              <div className={cn('rounded-full p-1', transactionIconBackground('WITHDRAWAL'))}>
                {transactionIcon('WITHDRAWAL')}
              </div>
              <span className="text-sm font-medium">{t('table.notReclaimed')}</span>
            </div>
            <SummaryAmount className="text-blue-600">{formatCurrency(notReclaimed)}</SummaryAmount>
          </div>
        )}
        <div
          className={cn(
            'flex items-center justify-between rounded-md px-2 py-1.5',
            showTotalBorder ? 'mt-2 border-t pt-2' : 'border-t first:border-t-0',
          )}
        >
          <div className="flex min-w-0 flex-1 items-center space-x-3">
            <div className="rounded-full bg-muted p-1">
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="text-sm font-bold">{t('table.balance')}</span>
          </div>
          <SummaryAmount className="font-bold text-sm text-foreground">{formatCurrency(balance ?? 0)}</SummaryAmount>
        </div>
      </div>
    </div>
  );
}
