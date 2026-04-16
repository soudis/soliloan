'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { InvestmentType, LimitationType, Loan } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { useAction } from 'next-safe-action/hooks';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { createInvestmentTypeAction, updateInvestmentTypeAction } from '@/actions/investment-types';
import { Form } from '@/components/ui/form';
import { FormActions } from '@/components/ui/form-actions';
import { FormLayout } from '@/components/ui/form-layout';
import { useRouter } from '@/i18n/navigation';
import {
  type InvestmentTypeFormData,
  investmentTypeFormSchema,
} from '@/lib/schemas/investment-type';
import { formatNumber } from '@/lib/utils';
import type { ProjectWithConfiguration } from '@/types/projects';
import { InvestmentTypeFormFields } from './investment-type-form-fields';

type InvestmentTypeWithLoans = InvestmentType & { loans: Loan[]; _count: { loans: number } };

interface Props {
  project: ProjectWithConfiguration;
  initialData?: InvestmentTypeWithLoans;
  prefilledInterestRate?: string;
}

export function InvestmentTypeFormClient({ project, initialData, prefilledInterestRate }: Props) {
  const t = useTranslations('dashboard.investmentTypes.form');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!initialData?.id;
  const hasLoans = (initialData?._count.loans ?? 0) > 0;

  const { executeAsync: create, isExecuting: isCreating } = useAction(createInvestmentTypeAction);
  const { executeAsync: update, isExecuting: isUpdating } = useAction(updateInvestmentTypeAction);

  const defaultValues = {
    interestRate: initialData ? formatNumber(initialData.interestRate, 0, 3) : prefilledInterestRate || ('' as const),
    limitationType: initialData?.limitationType || ('' as unknown as LimitationType),
    name: initialData?.name || null,
  };

  const form = useForm({
    resolver: zodResolver(investmentTypeFormSchema),
    defaultValues,
  });

  const handleSubmit = form.handleSubmit(async (data: InvestmentTypeFormData) => {
    try {
      setError(null);
      const result = isEditMode
        ? await update({
            projectId: project.id,
            investmentTypeId: initialData?.id ?? '',
            data,
          })
        : await create({ projectId: project.id, data });

      if (result?.data && 'fieldErrors' in result.data && result.data.fieldErrors) {
        for (const [field, message] of Object.entries(result.data.fieldErrors)) {
          form.setError(field as keyof InvestmentTypeFormData, { type: 'server', message: message as string });
        }
        return;
      }

      if (result?.serverError) {
        throw new Error(result.serverError);
      }

      toast.success(t('success'));
      router.push(`/investment-types?projectId=${project.id}`);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err instanceof Error ? err.message : t('error'));
      toast.error(t('error'));
    }
  });

  const isLoading = isCreating || isUpdating;

  return (
    <FormLayout title={isEditMode ? t('editTitle') : t('createTitle')} error={error}>
      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <InvestmentTypeFormFields hasLoans={hasLoans} />
          <FormActions
            submitButtonText={t('submit')}
            submittingButtonText={t('submitting')}
            cancelButtonText={t('cancel')}
            isLoading={isLoading}
          />
        </form>
      </Form>
    </FormLayout>
  );
}
