'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Form } from '@/components/ui/form';
import { FormActions } from '@/components/ui/form-actions';
import { FormLayout } from '@/components/ui/form-layout';
import { configurationFormSchema } from '@/lib/schemas/configuration';
import { useProject } from '@/store/project-context';

import { ConfigurationFormFields } from './configuration-form-fields';

import type { ConfigurationFormData } from '@/lib/schemas/configuration';
interface ConfigurationFormProps {
  title: string;
  submitButtonText: string;
  submittingButtonText: string;
  cancelButtonText: string;
  onSubmit: (data: ConfigurationFormData) => Promise<void>;
  initialData?: Partial<ConfigurationFormData>;
  isLoading?: boolean;
  error?: string | null;
  hasHistoricTransactions?: boolean;
}

export function ConfigurationForm({
  title,
  submitButtonText,
  submittingButtonText,
  cancelButtonText,
  onSubmit,
  initialData,
  isLoading,
  error,
  hasHistoricTransactions,
}: ConfigurationFormProps) {
  const { selectedProject } = useProject();

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
    userLanguage: initialData?.userLanguage || '',
    userTheme: initialData?.userTheme || '',
    lenderRequiredFields: initialData?.lenderRequiredFields || [],
    lenderSalutation: initialData?.lenderSalutation || '',
    lenderCountry: initialData?.lenderCountry || '',
    lenderNotificationType: initialData?.lenderNotificationType || '',
    lenderMembershipStatus: initialData?.lenderMembershipStatus || '',
    lenderTags: initialData?.lenderTags || [],
    interestMethod: initialData?.interestMethod || '',
    altInterestMethods: initialData?.altInterestMethods || [],
    customLoans: initialData?.customLoans || false,
  };

  const form = useForm({
    resolver: zodResolver(configurationFormSchema),
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
    <FormLayout title={title} error={error}>
      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <ConfigurationFormFields hasHistoricTransactions={hasHistoricTransactions} />

          <FormActions
            submitButtonText={submitButtonText}
            submittingButtonText={submittingButtonText}
            cancelButtonText={cancelButtonText}
            isLoading={isLoading}
          />
        </form>
      </Form>
    </FormLayout>
  );
}
