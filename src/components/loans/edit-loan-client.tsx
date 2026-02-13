'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { updateLoanAction } from '@/actions/loans';
import { LoanForm } from '@/components/loans/loan-form';
import { useRouter } from '@/i18n/navigation';
import type { LoanFormData } from '@/lib/schemas/loan';
import { getLenderName } from '@/lib/utils';
import type { LoanWithRelations } from '@/types/loans';
import type { ProjectWithConfiguration } from '@/types/projects';

interface EditLoanClientProps {
  loan: LoanWithRelations;
  project: ProjectWithConfiguration;
}

export function EditLoanClient({ loan, project }: EditLoanClientProps) {
  const router = useRouter();
  const t = useTranslations('dashboard.loans');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: LoanFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const result = await updateLoanAction({ loanId: loan.id, data });

      if (result?.serverError || result?.validationErrors) {
        throw new Error(result.serverError || 'Validation failed');
      }

      const updatedLoan = result?.data?.loan;

      toast.success(t('edit.form.success'));
      if (updatedLoan) {
        router.push(`/${project.id}/lenders/${updatedLoan.lenderId}?tab=loans&loanId=${updatedLoan.id}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      toast.error(t('edit.form.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LoanForm
      project={project}
      title={t('edit.title', { lenderName: getLenderName(loan.lender) })}
      submitButtonText={t('edit.form.submit')}
      submittingButtonText={t('edit.form.submitting')}
      cancelButtonText={t('edit.form.cancel')}
      onSubmit={handleSubmit}
      initialData={loan}
      isLoading={isSubmitting}
      error={error}
    />
  );
}
