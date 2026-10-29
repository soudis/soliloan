'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { Transaction, TransactionType } from '@prisma/client';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import moment from 'moment';
import { useEffect, useRef } from 'react';
import { type Control, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { addTransactionAction, updateTransactionAction } from '@/actions/loans';
import { FormCheckbox } from '@/components/form/form-checkbox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { type TransactionFormData, transactionFormSchema } from '@/lib/schemas/transaction';
import { formatCurrency, formatDateShort, formatPercentage } from '@/lib/utils';
import type { LoanDetailsWithCalculations } from '@/types/loans';

import { LoanStatusBadge } from './loan-status-badge';
import { TransactionFormFields } from './transaction-form-fields';
import { useTransactionPreview } from './use-transaction-preview';

interface TransactionDialogProps {
  loanId: string;
  loan: LoanDetailsWithCalculations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set to edit an existing Zahlung instead of creating a new one. */
  transaction?: Transaction;
  /** Called after a successful create or save (not cancel). */
  onCreated?: () => void;
}

const amountFormatter = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function TransactionDialog({
  loanId,
  loan,
  open,
  onOpenChange,
  transaction,
  onCreated,
}: TransactionDialogProps) {
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const isEdit = !!transaction;

  // A new Zahlung starts on today; an edit starts from the stored values
  const defaultValues = transaction
    ? {
        type: transaction.type,
        date: transaction.date,
        amount: amountFormatter.format(Math.abs(transaction.amount)),
        paymentType: transaction.paymentType,
        notifyLender: false,
      }
    : {
        type: '',
        date: moment().startOf('day').toDate(),
        amount: '',
        paymentType: 'BANK',
        notifyLender: false,
      };

  const form = useForm({
    resolver: zodResolver(transactionFormSchema),
    defaultValues,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when dialog opens/closes or another Zahlung is edited
  useEffect(() => {
    form.reset(defaultValues);
  }, [open, transaction?.id]);

  const { preview, isPending } = useTransactionPreview({
    loanId,
    transactionId: transaction?.id,
    control: form.control as unknown as Control<TransactionFormData>,
    enabled: open,
  });

  const { isSubmitting } = form.formState;
  const submitLock = useRef(false);

  const selectedType = form.watch('type') as TransactionType | '';
  const typeUnavailable = !!selectedType && preview?.types[selectedType]?.available === false;
  const canSubmit = !!preview && !isPending && preview.errors.length === 0 && !typeUnavailable;

  const handleSubmit = form.handleSubmit(async (data) => {
    if (submitLock.current) return;
    submitLock.current = true;
    try {
      const result = transaction
        ? await updateTransactionAction({ transactionId: transaction.id, data })
        : await addTransactionAction({ loanId, data });
      if (result?.serverError || result?.validationErrors) {
        toast.error(result.serverError ?? t(isEdit ? 'transactions.editError' : 'transactions.createError'));
        return;
      }
      toast.success(t(isEdit ? 'transactions.editSuccess' : 'transactions.createSuccess'));
      onCreated?.();
      onOpenChange(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['lender'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    } finally {
      submitLock.current = false;
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="space-y-3">
          <DialogTitle>{isEdit ? t('transactions.editTitle') : t('transactions.createTitle')}</DialogTitle>
          <DialogDescription asChild className="text-foreground">
            <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-white p-3 text-left">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-semibold text-foreground">
                  {t('table.loanNumberShort')} #{loan.loanNumber}
                </span>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{formatCurrency(loan.amount)}</span>
                  <span>·</span>
                  <span>{formatPercentage(loan.interestRate)}</span>
                  <span>·</span>
                  <span>{formatDateShort(loan.signDate, locale)}</span>
                </div>
              </div>
              <LoanStatusBadge status={loan.status} />
            </div>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <TransactionFormFields
              preview={preview}
              isPending={isPending}
              transactionId={transaction?.id}
              originalType={transaction?.type}
            />

            <FormCheckbox
              name="notifyLender"
              label={t('transactions.notifyLender')}
              hint={t('transactions.notifyLenderHint')}
            />

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {commonT('ui.actions.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting || !canSubmit}>
                {isEdit
                  ? isSubmitting
                    ? commonT('ui.actions.saving')
                    : commonT('ui.actions.save')
                  : isSubmitting
                    ? commonT('ui.actions.creating')
                    : commonT('ui.actions.create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
