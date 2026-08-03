'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { addTransactionAction } from '@/actions/loans';
import { FormCheckbox } from '@/components/form/form-checkbox';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { getTransactionDialogLoanContext } from '@/lib/loans/transaction-dialog-loan-context';
import { transactionFormSchema } from '@/lib/schemas/transaction';
import type { LoanDetailsWithCalculations } from '@/types/loans';

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

  const { loanLabel, generalInfo, detailInfo } = getTransactionDialogLoanContext(
    loan,
    (key, values) => t(`transactions.${key}`, values),
    locale,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="space-y-3">
          <DialogTitle>{t('transactions.createTitle')}</DialogTitle>
          <DialogDescription asChild className="text-foreground">
            <div className="flex gap-3 rounded-md border border-border bg-white p-3 text-left text-sm text-foreground">
              <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden />
              <div className="min-w-0 space-y-1 text-foreground">
                <p>
                  <span>{loanLabel}</span>
                  {generalInfo ? ` ${generalInfo}` : null}
                  {!generalInfo ? ` ${detailInfo}` : null}
                </p>
                {generalInfo ? <p>{detailInfo}</p> : null}
              </div>
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
