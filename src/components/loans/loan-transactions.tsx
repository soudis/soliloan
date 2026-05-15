'use client';

import type { Transaction } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { deleteTransactionAction } from '@/actions/loans';
import { ConfirmDialog } from '@/components/generic/confirm-dialog';
import { TemplateQuickActions } from '@/components/templates/template-quick-actions';
import { cn, formatCurrency, formatDateLong } from '@/lib/utils';
import type { LoanDetailsWithCalculations } from '@/types/loans';

import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { LoanAddTransactionControl } from './loan-add-transaction-control';
import {
  LoanBalanceSummary,
  TRANSACTION_ACTIONS_SLOT_CLASS,
  TRANSACTION_AMOUNT_CLASS,
  transactionIcon,
  transactionIconBackground,
} from './loan-balance-summary';

const PAGE_SIZE = 10;

interface LoanTransactionsProps {
  loanId: string;
  transactions: Transaction[];
  loan: LoanDetailsWithCalculations;
  /** Hide mutations, templates, add — for lender portal */
  readOnly?: boolean;
  /** Show deposit/interest/withdrawal totals and balance below the list (same data as BalanceTable sums) */
  showBalanceSummary?: boolean;
  /**
   * When false, the add control is omitted so the parent can render {@link LoanAddTransactionControl} elsewhere
   * (e.g. above {@link LoanBalanceSummary}).
   */
  showAddTransaction?: boolean;
}

export function LoanTransactions({
  loanId,
  transactions,
  loan,
  readOnly = false,
  showBalanceSummary = false,
  showAddTransaction = true,
}: LoanTransactionsProps) {
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const locale = useLocale();
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

  const addTransactionEnabled = !readOnly && showAddTransaction;

  return (
    <>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">{t('table.transactions')}</h4>

          <div className="flex items-center justify-between space-x-4 pb-2">
            <div className="flex items-center gap-2">
              <Switch
                id="bookings-mode"
                checked={showBookings}
                onCheckedChange={(checked) => {
                  setShowBookings(checked);
                  setPage(0);
                }}
              />
              <Label htmlFor="bookings-mode" className="cursor-pointer text-xs text-muted-foreground">
                {showBookings ? t('table.bookings') : t('table.transactions')}
              </Label>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {filtered.length} {filtered.length === 1 ? 'Eintrag' : 'Einträge'}
            </span>
          </div>
        </div>

        {paginated.map((transaction) => (
          <div
            key={transaction.id}
            className={cn(
              'flex items-center justify-between rounded-md border-t px-2 py-1.5 first:border-t-0',
              transaction.type === 'INTEREST' && 'opacity-60',
            )}
          >
            <div className="flex min-w-0 flex-1 items-center space-x-3">
              <div className={cn('rounded-full p-1', transactionIconBackground(transaction.type))}>
                {transactionIcon(transaction.type)}
              </div>
              <div>
                <div className="text-sm font-medium">{commonT(`enums.transaction.type.${transaction.type}`)}</div>
                <div className="text-xs text-muted-foreground">{formatDateLong(transaction.date, locale)}</div>
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
          <div className="py-4 text-center text-sm text-muted-foreground">{t('transactions.noTransactions')}</div>
        )}

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

        {addTransactionEnabled && (
          <LoanAddTransactionControl loanId={loanId} loan={loan} className="w-full border-dashed py-6" />
        )}
      </div>

      {!readOnly && (
        <ConfirmDialog
          open={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          onConfirm={handleConfirmDelete}
          title={t('transactions.delete.confirmTitle')}
          description={t('transactions.delete.confirmDescription')}
          confirmText={commonT('ui.actions.delete')}
        />
      )}
    </>
  );
}
