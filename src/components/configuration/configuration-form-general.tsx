'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Form } from '@/components/ui/form';
import { FormActions } from '@/components/ui/form-actions';
import { FormLayout } from '@/components/ui/form-layout';
import { configurationFormGeneralSchema, configurationFormSchema } from '@/lib/schemas/configuration';

import type { ConfigurationFormGeneralData } from '@/lib/schemas/configuration';
import { useProjects } from '@/store/projects-store';
import { useTranslations } from 'next-intl';
import { ConfigurationFormFieldsGeneral } from './configuration-form-fields-general';

type Props = {
  onSubmit: (data: ConfigurationFormGeneralData) => Promise<void>;
  initialData?: Partial<ConfigurationFormGeneralData>;
  isLoading?: boolean;
  error?: string | null;
};

export function ConfigurationFormGeneral({ onSubmit, initialData, isLoading, error }: Props) {
  const { selectedProject } = useProjects();
  const t = useTranslations('dashboard.configuration');

  const defaultValues = {
    name: initialData?.name || '',
    logo: initialData?.logo || '',
    email: initialData?.email || '',
    telNo: initialData?.telNo || '',
    website: initialData?.website || '',
    street: initialData?.street || '',
    addon: initialData?.addon || '',
    zip: initialData?.zip || '',
    place: initialData?.place || '',
    country: initialData?.country || '',
    iban: initialData?.iban || '',
    bic: initialData?.bic || '',
  };

  const form = useForm({
    resolver: zodResolver(configurationFormGeneralSchema),
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
          <ConfigurationFormFieldsGeneral />

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
