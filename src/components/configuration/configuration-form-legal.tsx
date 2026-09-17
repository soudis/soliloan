'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { FormLayout } from '@/components/ui/form-layout';

import { configurationFormLegalSchema } from '@/lib/schemas/configuration';
import { ConfigurationFormFieldsLegal } from './configuration-form-fields-legal';

type Props = {
  projectId: string;
  germanLoansCount: number;
  initialEnabled?: boolean;
};

export function ConfigurationFormLegal({ projectId, germanLoansCount, initialEnabled }: Props) {
  const form = useForm({
    resolver: zodResolver(configurationFormLegalSchema),
    defaultValues: {
      deInvestmentActCompliance: initialEnabled ?? false,
    },
  });

  return (
    <FormLayout>
      <Form {...form}>
        <ConfigurationFormFieldsLegal projectId={projectId} germanLoansCount={germanLoansCount} />
      </Form>
    </FormLayout>
  );
}
