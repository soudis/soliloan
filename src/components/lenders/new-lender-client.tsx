'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { createLenderAction } from '@/actions/lenders';
import { LenderForm } from '@/components/lenders/lender-form';
import { useRouter } from '@/i18n/navigation';
import type { LenderFormData } from '@/lib/schemas/lender';

interface NewLenderClientProps {
  projectId: string;
}

export function NewLenderClient({ projectId }: NewLenderClientProps) {
  const router = useRouter();
  const t = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: LenderFormData) => {
    try {
      setIsSubmitting(true);

      const result = await createLenderAction({ ...data, projectId });

      if (result?.serverError || result?.validationErrors) {
        throw new Error(result.serverError || 'Validation failed');
      }

      toast.success(t('new.form.success'));

      if (result?.data?.id) {
        router.push(`/${projectId}/lenders/${result.data.id}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      toast.error(t('new.form.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LenderForm
      title={t('new.title')}
      submitButtonText={commonT('ui.actions.create')}
      submittingButtonText={commonT('ui.actions.creating')}
      cancelButtonText={commonT('ui.actions.cancel')}
      onSubmit={handleSubmit}
      error={error}
      isLoading={isSubmitting}
    />
  );
}
