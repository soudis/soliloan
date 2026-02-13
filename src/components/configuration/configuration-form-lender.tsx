'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { FormActions } from '@/components/ui/form-actions';
import { FormLayout } from '@/components/ui/form-layout';

import type { ConfigurationFormLenderData } from '@/lib/schemas/configuration';
import { configurationFormLenderSchema } from '@/lib/schemas/configuration';
import { useProjects } from '@/store/projects-store';
import { ConfigurationFormFieldsLender } from './configuration-form-fields-lender';

type Props = {
  onSubmit: (data: ConfigurationFormLenderData) => Promise<void>;
  initialData?: ConfigurationFormLenderData;
  isLoading?: boolean;
  error?: string | null;
};

export function ConfigurationFormLender({ onSubmit, initialData, isLoading, error }: Props) {
  const { selectedProject } = useProjects();
  const t = useTranslations('dashboard.configuration');

  const defaultValues = {
    userLanguage: initialData?.userLanguage || '',
    userTheme: initialData?.userTheme || '',
    lenderRequiredFields: initialData?.lenderRequiredFields || [],
    lenderSalutation: initialData?.lenderSalutation || '',
    lenderCountry: initialData?.lenderCountry || '',
    lenderAdditionalFields: initialData?.lenderAdditionalFields || [],
  };

  const form = useForm({
    resolver: zodResolver(configurationFormLenderSchema),
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
          <ConfigurationFormFieldsLender />

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
