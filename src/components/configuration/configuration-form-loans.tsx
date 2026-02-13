'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { FormActions } from '@/components/ui/form-actions';
import { FormLayout } from '@/components/ui/form-layout';

import type { ConfigurationFormLoanData } from '@/lib/schemas/configuration';
import { configurationFormLoanSchema } from '@/lib/schemas/configuration';
import { useProjects } from '@/store/projects-store';
import { ConfigurationFormFieldsLoans } from './configuration-form-fields-loans';

type Props = {
  onSubmit: (data: ConfigurationFormLoanData) => Promise<void>;
  hasHistoricTransactions?: boolean;
  initialData?: ConfigurationFormLoanData;
  isLoading?: boolean;
  error?: string | null;
};

export function ConfigurationFormLoans({ onSubmit, hasHistoricTransactions, initialData, isLoading, error }: Props) {
  const { selectedProject } = useProjects();
  const t = useTranslations('dashboard.configuration');

  const defaultValues = {
    interestMethod: initialData?.interestMethod || '',
    altInterestMethods: initialData?.altInterestMethods || [],
    loanAdditionalFields: initialData?.loanAdditionalFields || [],
  };

  const form = useForm({
    resolver: zodResolver(configurationFormLoanSchema),
    defaultValues,
  });

  if (!selectedProject) {
    return null;
  }

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  });

  return (
    <FormLayout error={error}>
      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <ConfigurationFormFieldsLoans hasHistoricTransactions={hasHistoricTransactions} />

          <FormActions
            submitButtonText={t('form.submit')}
            submittingButtonText={t('form.submitting')}
            cancelButtonText={t('form.cancel')}
            isLoading={isLoading}
          />
        </form>
      </Form>
    </FormLayout>
  );
}
