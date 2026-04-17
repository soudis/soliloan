'use client';

import type { Transaction } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { ArrowDownIcon, ArrowUpIcon, ChevronLeft, ChevronRight, Percent, Plus, Receipt, Trash2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
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

interface LoanTransactionsProps {
  loanId: string;
  transactions: Transaction[];
  loan: LoanDetailsWithCalculations;
  /** Hide mutations, templates, add — for lender portal */
  readOnly?: boolean;
}

export function LoanTransactions({ loanId, transactions, loan, readOnly = false }: LoanTransactionsProps) {
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

  const getTransactionIcon = (type: Transaction['type']) => {
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
  };

  const getTransactionIconBackground = (type: Transaction['type']) => {
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
            <div className="flex items-center space-x-3">
              <div className={cn('rounded-full p-1', getTransactionIconBackground(transaction.type))}>
                {getTransactionIcon(transaction.type)}
              </div>
              <div>
                <div className="text-sm font-medium">{commonT(`enums.transaction.type.${transaction.type}`)}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(transaction.date), 'PPP', { locale: dateLocale })}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="font-medium font-mono text-sm">{formatCurrency(transaction.amount)}</div>
              {!readOnly && transaction.type !== 'INTEREST' && (
                <TemplateQuickActions
                  projectId={loan.lender.projectId}
                  mode="transaction"
                  lenderId={loan.lender.id}
                  loanId={loan.id}
                  transactionId={transaction.id}
                  density="compact"
                />
              )}
              {!readOnly && (
                <div className="w-8 flex justify-end">
                  {transaction.id === lastNonInterest?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteClick(transaction.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      <span className="sr-only">{commonT('ui.actions.delete')}</span>
                    </Button>
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
