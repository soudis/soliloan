'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { addTransactionAction } from '@/actions/loans';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { transactionFormSchema } from '@/lib/schemas/transaction';

import { TransactionFormFields } from './transaction-form-fields';

interface TransactionDialogProps {
  loanId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDialog({ loanId, open, onOpenChange }: TransactionDialogProps) {
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const queryClient = useQueryClient();

  const defaultValues = {
    type: '',
    date: '',
    amount: '',
    paymentType: 'BANK',
  };

  const form = useForm({
    resolver: zodResolver(transactionFormSchema),
    defaultValues,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
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
        <DialogHeader>
          <DialogTitle>{t('transactions.createTitle')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <TransactionFormFields loanId={loanId} />

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
