'use client';

import type { Transaction } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronLeft,
  ChevronRight,
  Percent,
  Plus,
  Receipt,
  Wallet,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { deleteTransactionAction } from '@/actions/loans';
import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { TemplateQuickActions } from '@/components/templates/template-quick-actions';
import { cn, formatCurrency } from '@/lib/utils';
import { type LoanDetailsWithCalculations, LoanStatus } from '@/types/loans';

import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { TransactionDialog } from './transaction-dialog';

const PAGE_SIZE = 10;

/** Match data-table actions column (`w-9`); single … menu per row. */
const TRANSACTION_ACTIONS_SLOT_CLASS = 'flex w-9 min-w-[2.25rem] shrink-0 justify-end';
const TRANSACTION_AMOUNT_CLASS =
  'min-w-[9rem] shrink-0 text-right font-medium font-mono text-sm tabular-nums';

function transactionIcon(type: Transaction['type']) {
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

function transactionIconBackground(type: Transaction['type']) {
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

interface LoanTransactionsProps {
  loanId: string;
  transactions: Transaction[];
  loan: LoanDetailsWithCalculations;
  /** Hide mutations, templates, add — for lender portal */
  readOnly?: boolean;
  /** Show deposit/interest/withdrawal totals and balance below the list (same data as BalanceTable sums) */
  showBalanceSummary?: boolean;
}

export function LoanTransactions({
  loanId,
  transactions,
  loan,
  readOnly = false,
  showBalanceSummary = false,
}: LoanTransactionsProps) {
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const dateLocale = locale === 'de' ? de : enUS;
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [showBookings, setShowBookings] = useState(true);
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

  const filtered = useMemo(
    () => (showBookings ? transactions : transactions.filter((tx) => tx.type !== 'INTEREST')),
    [transactions, showBookings],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const handleDeleteClick = (transactionId: string) => {
    setTransactionToDelete(transactionId);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;

    const toastId = toast.loading(t('transactions.delete.loading'));

    const result = await deleteTransactionAction({ transactionId: transactionToDelete });

    if (result?.serverError || result?.validationErrors) {
      toast.error(t('transactions.delete.error'), { id: toastId });
    } else {
      toast.success(t('transactions.delete.success'), { id: toastId });
      queryClient.invalidateQueries({ queryKey: ['lender'] });
    }
    setTransactionToDelete(null);
  };

  const lastNonInterest = transactions.findLast((tx) => tx.type !== 'INTEREST');

  return (
    <>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">{t('table.transactions')}</h4>

          <div className="flex items-center justify-between pb-2 space-x-4">
            <div className="flex items-center gap-2">
              <Switch
                id="bookings-mode"
                checked={showBookings}
                onCheckedChange={(checked) => {
                  setShowBookings(checked);
                  setPage(0);
                }}
              />
              <Label htmlFor="bookings-mode" className="text-xs text-muted-foreground cursor-pointer">
                {showBookings ? t('table.bookings') : t('table.transactions')}
              </Label>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {filtered.length} {filtered.length === 1 ? 'Eintrag' : 'Einträge'}
            </span>
          </div>
        </div>

        {/* Transaction list */}
        {paginated.map((transaction) => (
          <div
            key={transaction.id}
            className={cn(
              'flex items-center justify-between rounded-md px-2 py-1.5 border-t first:border-t-0',
              transaction.type === 'INTEREST' && 'opacity-60',
            )}
          >
            <div className="flex min-w-0 flex-1 items-center space-x-3">
              <div className={cn('rounded-full p-1', transactionIconBackground(transaction.type))}>
                {transactionIcon(transaction.type)}
              </div>
              <div>
                <div className="text-sm font-medium">{commonT(`enums.transaction.type.${transaction.type}`)}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(transaction.date), 'PPP', { locale: dateLocale })}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className={TRANSACTION_AMOUNT_CLASS}>{formatCurrency(transaction.amount)}</div>
              {!readOnly && (
                <div className={TRANSACTION_ACTIONS_SLOT_CLASS}>
                  {transaction.type !== 'INTEREST' ? (
                    <TemplateQuickActions
                      projectId={loan.lender.projectId}
                      mode="transaction"
                      lenderId={loan.lender.id}
                      loanId={loan.id}
                      transactionId={transaction.id}
                      rowMenu={{
                        showDelete: transaction.id === lastNonInterest?.id,
                        onDelete: () => handleDeleteClick(transaction.id),
                      }}
                    />
                  ) : (
                    <span className="inline-flex h-7 w-7" aria-hidden />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-4">{t('transactions.noTransactions')}</div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {showBalanceSummary && <LoanBalanceSummary loan={loan} readOnly={readOnly} />}

        {!readOnly && (
          <Button
            variant="outline"
            className="w-full border-dashed py-6"
            size="sm"
            onClick={() => setIsTransactionDialogOpen(true)}
            disabled={loan.status === LoanStatus.REPAID}
          >
            <Plus className="h-4 w-4 mr-2" />
            {commonT('terms.transaction')}
          </Button>
        )}
      </div>

      {!readOnly && (
        <>
          <TransactionDialog loanId={loanId} open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen} />

          <ConfirmDialog
            open={isConfirmOpen}
            onOpenChange={setIsConfirmOpen}
            onConfirm={handleConfirmDelete}
            title={t('transactions.delete.confirmTitle')}
            description={t('transactions.delete.confirmDescription')}
            confirmText={commonT('ui.actions.delete')}
          />
        </>
      )}
    </>
  );
}

function LoanBalanceSummary({
  loan,
  readOnly,
}: {
  loan: LoanDetailsWithCalculations;
  readOnly: boolean;
}) {
  const t = useTranslations('dashboard.loans');
  const { deposits, withdrawals, notReclaimed, interest, interestPaid, interestError, balance } = loan;

  const showTotalBorder =
    deposits !== 0 || withdrawals > 0 || interest > 0 || interestPaid !== 0 || notReclaimed > 0 || interestError > 0;

  const rowClass =
    'flex items-center justify-between rounded-md border-t px-2 py-1.5 first:border-t-0';

  function SummaryAmount({ className, children }: { className?: string; children: ReactNode }) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <div className={cn(TRANSACTION_AMOUNT_CLASS, className)}>{children}</div>
        {!readOnly && <div className={TRANSACTION_ACTIONS_SLOT_CLASS} aria-hidden />}
      </div>
    );
  }

  return (
    <div className="mt-2 border-t pt-2">
      <h4 className="text-sm font-medium text-muted-foreground mb-2">{t('table.totals')}</h4>
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
          <SummaryAmount className="font-bold text-foreground">{formatCurrency(balance ?? 0)}</SummaryAmount>
        </div>
      </div>
    </div>
  );
}
