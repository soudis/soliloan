'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';

import { upsertLoanTemplateAction } from '@/actions/projects/mutations/upsert-loan-template';
import { loanTemplateFormSchema } from '@/lib/schemas/configuration';
import { convertEmptyToNull } from '@/lib/utils/form';
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks';
import { DurationType, type LoanTemplate, TerminationType } from '@prisma/client';
import { useAction } from 'next-safe-action/hooks';
import { LoanTemplateFormFields } from './loan-template-form-fields';

type Props = {
  configurationId: string;
  initialValues?: LoanTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LoanTemplateDialog({ configurationId, initialValues, open, onOpenChange }: Props) {
  const t = useTranslations('dashboard.configuration.form.loanTemplates');
  const commonT = useTranslations('common');
  const queryClient = useQueryClient();

  const { executeAsync: upsertLoanTemplate, reset: resetAction } = useAction(upsertLoanTemplateAction, {
    onSuccess: () => {
      if (initialValues) {
        toast.success(t('editSuccess'));
      } else {
        toast.success(t('createSuccess'));
      }
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? commonT('ui.actions.error'));
    },
  });

  const form = useForm({
    resolver: zodResolver(loanTemplateFormSchema),
    defaultValues: {
      id: initialValues?.id,
      name: initialValues?.name ?? 'Neue Kreditvorlage',
      isDefault: initialValues?.isDefault ?? false,
      terminationType: initialValues?.terminationType ?? TerminationType.TERMINATION,
      terminationPeriod: initialValues?.terminationPeriod ?? '',
      terminationPeriodType: initialValues?.terminationPeriodType ?? DurationType.MONTHS,
      duration: initialValues?.duration ?? '',
      durationType: initialValues?.durationType ?? DurationType.YEARS,
      endDate: initialValues?.endDate ?? '',
      minInterestRate: (initialValues?.minInterestRate ?? 0) > 0 ? initialValues?.minInterestRate : '',
      maxInterestRate: (initialValues?.maxInterestRate ?? 0) > 0 ? initialValues?.maxInterestRate : '',
      minAmount: (initialValues?.minAmount ?? 0) > 0 ? initialValues?.minAmount : '',
      maxAmount: (initialValues?.maxAmount ?? 0) > 0 ? initialValues?.maxAmount : '',
      configurationId,
    },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    resetAction();
    form.reset({
      id: initialValues?.id,
      name: initialValues?.name ?? 'Neue Kreditvorlage',
      isDefault: initialValues?.isDefault ?? false,
      terminationType: initialValues?.terminationType ?? TerminationType.TERMINATION,
      terminationPeriod: initialValues?.terminationPeriod ?? '',
      terminationPeriodType: initialValues?.terminationPeriodType ?? DurationType.MONTHS,
      duration: initialValues?.duration ?? '',
      durationType: initialValues?.durationType ?? DurationType.YEARS,
      endDate: initialValues?.endDate ?? '',
      minInterestRate: (initialValues?.minInterestRate ?? 0) > 0 ? initialValues?.minInterestRate : '',
      maxInterestRate: (initialValues?.maxInterestRate ?? 0) > 0 ? initialValues?.maxInterestRate : '',
      minAmount: (initialValues?.minAmount ?? 0) > 0 ? initialValues?.minAmount : '',
      maxAmount: (initialValues?.maxAmount ?? 0) > 0 ? initialValues?.maxAmount : '',
      configurationId,
    });
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialValues ? t('editTitle') : t('createTitle')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(event) => {
              event.stopPropagation();
              form.handleSubmit(async (values) => {
                await upsertLoanTemplate({
                  ...convertEmptyToNull(values),
                  configurationId,
                  name: values.name,
                  terminationType: values.terminationType,
                });
              })(event);
            }}
            className="space-y-4"
          >
            <LoanTemplateFormFields />

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  console.log('cancel');
                  onOpenChange(false);
                }}
              >
                {commonT('ui.actions.cancel')}
              </Button>
              <Button type="submit">{initialValues ? commonT('ui.actions.save') : commonT('ui.actions.create')}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
