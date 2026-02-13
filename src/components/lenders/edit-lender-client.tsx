'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { updateLenderAction } from '@/actions/lenders';
import { LenderForm } from '@/components/lenders/lender-form';
import { useRouter } from '@/i18n/navigation';
import type { LenderFormData } from '@/lib/schemas/lender';
import type { LenderWithCalculations } from '@/types/lenders';

interface EditLenderClientProps {
  lender: LenderWithCalculations;
  projectId: string;
}

export function EditLenderClient({ lender, projectId }: EditLenderClientProps) {
  const router = useRouter();
  const t = useTranslations('dashboard.lenders');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: LenderFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const result = await updateLenderAction({ lenderId: lender.id, data });

      if (result?.serverError || result?.validationErrors) {
        throw new Error(result.serverError || 'Validation failed');
      }

      toast.success(t('edit.form.success'));
      router.push(`/${projectId}/lenders/${lender.id}`);
    } catch (error) {
      console.error('Error submitting form:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      toast.error(t('edit.form.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LenderForm
      title={t('edit.title')}
      submitButtonText={t('edit.form.submit')}
      submittingButtonText={t('edit.form.submitting')}
      cancelButtonText={t('edit.form.cancel')}
      onSubmit={handleSubmit}
      initialData={lender}
      isLoading={isSubmitting}
      error={error}
    />
  );
}
