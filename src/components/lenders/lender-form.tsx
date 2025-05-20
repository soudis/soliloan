'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LenderRequiredField, LenderType } from '@prisma/client';
import { useForm } from 'react-hook-form';

import { Form } from '@/components/ui/form';
import { FormActions } from '@/components/ui/form-actions';
import { FormLayout } from '@/components/ui/form-layout';
import {
  type AdditionalFieldValues,
  validateAddressOptional,
  validateAddressRequired,
  validateFieldRequired,
} from '@/lib/schemas/common';
import { lenderFormSchema } from '@/lib/schemas/lender';
import { useProject } from '@/store/project-context';

import { LenderFormFields } from './lender-form-fields';

import type { LenderFormData } from '@/lib/schemas/lender';
import { additionalFieldDefaults, validateAdditionalFields } from '@/lib/utils/additional-fields';
import type { LenderWithRelations } from '@/types/lenders';
import { useEffect, useMemo } from 'react';
import type { ZodSchema } from 'zod';

interface LenderFormProps {
  title: string;
  submitButtonText: string;
  submittingButtonText: string;
  cancelButtonText: string;
  onSubmit: (data: LenderFormData) => Promise<void>;
  initialData?: Partial<LenderWithRelations>;
  isLoading?: boolean;
  error?: string | null;
}

export function LenderForm({
  title,
  submitButtonText,
  submittingButtonText,
  cancelButtonText,
  onSubmit,
  initialData,
  isLoading,
  error,
}: LenderFormProps) {
  const { selectedProject } = useProject();

  const initialType = initialData?.type || LenderType.PERSON;

  let schema: ZodSchema;
  schema = lenderFormSchema;

  if (selectedProject?.configuration?.lenderRequiredFields.includes(LenderRequiredField.address)) {
    schema = schema.superRefine(validateAddressRequired);
  } else {
    schema = schema.superRefine(validateAddressOptional);
  }
  if (selectedProject?.configuration?.lenderRequiredFields.includes(LenderRequiredField.email)) {
    schema = schema.superRefine(validateFieldRequired('email'));
  }
  if (selectedProject?.configuration?.lenderRequiredFields.includes(LenderRequiredField.telNo)) {
    schema = schema.superRefine(validateFieldRequired('telNo'));
  }

  schema = schema.superRefine(
    validateAdditionalFields('additionalFields', selectedProject?.configuration?.lenderAdditionalFields),
  );

  const defaultValues = useMemo(() => {
    return {
      type: initialType,
      salutation: initialData?.salutation || selectedProject?.configuration?.lenderSalutation || '',
      projectId: selectedProject?.id || '',
      // Contact Information
      email: initialData?.email || '',
      telNo: initialData?.telNo || '',
      // Address Information
      street: initialData?.street || '',
      addon: initialData?.addon || '',
      zip: initialData?.zip || '',
      place: initialData?.place || '',
      country: initialData?.country || selectedProject?.configuration?.lenderCountry || '',
      // Banking Information
      iban: initialData?.iban || '',
      bic: initialData?.bic || '',
      // Additional Information
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      titlePrefix: initialData?.titlePrefix || '',
      titleSuffix: initialData?.titleSuffix || '',
      organisationName: '',
      additionalFields: additionalFieldDefaults(
        selectedProject?.configuration?.lenderAdditionalFields || [],
        (initialData?.additionalFields as AdditionalFieldValues | undefined) || {},
      ),
      // Include any other fields from initialData that might not be explicitly handled
    };
  }, [initialData, initialType, selectedProject]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

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
          <LenderFormFields />
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
