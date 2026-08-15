'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { addTransactionAction } from '@/actions/loans';
import { FormCheckbox } from '@/components/form/form-checkbox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { transactionFormSchema } from '@/lib/schemas/transaction';
import { formatCurrency, formatDateShort, formatPercentage } from '@/lib/utils';
import type { LoanDetailsWithCalculations } from '@/types/loans';

import { LoanStatusBadge } from './loan-status-badge';
import { TransactionFormFields } from './transaction-form-fields';

interface TransactionDialogProps {
  loanId: string;
  loan: LoanDetailsWithCalculations;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDialog({ loanId, loan, open, onOpenChange }: TransactionDialogProps) {
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const queryClient = useQueryClient();

  const defaultValues = {
    type: '',
    date: '',
    amount: '',
    paymentType: 'BANK',
    notifyLender: false,
  };

  const form = useForm({
    resolver: zodResolver(transactionFormSchema),
    defaultValues,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when dialog opens/closes
  useEffect(() => {
    form.reset(defaultValues);
  }, [open]);

  const handleSubmit = form.handleSubmit(async (data) => {
    const result = await addTransactionAction({
      loanId,
      data,
    });
    if (result?.serverError || result?.validationErrors) {
      toast.error(t('transactions.createError'));
      return;
    }
    toast.success(t('transactions.createSuccess'));
    onOpenChange(false);
    form.reset();
    queryClient.invalidateQueries({ queryKey: ['lender'] });
    queryClient.invalidateQueries({ queryKey: ['loans'] });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="space-y-3">
          <DialogTitle>{t('transactions.createTitle')}</DialogTitle>
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
            <TransactionFormFields loanId={loanId} />

            <FormCheckbox
              name="notifyLender"
              label={t('transactions.notifyLender')}
              hint={t('transactions.notifyLenderHint')}
            />

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {commonT('ui.actions.cancel')}
              </Button>
              <Button type="submit">{commonT('ui.actions.create')}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
