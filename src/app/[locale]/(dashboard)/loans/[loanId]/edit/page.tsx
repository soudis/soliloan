'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { use, useState } from 'react';
import { toast } from 'sonner';

import { getLoanAction, updateLoanAction } from '@/actions/loans';
import { LoanForm } from '@/components/loans/loan-form';
import { useRouter } from '@/i18n/navigation';
import { getLenderName } from '@/lib/utils';
import { useProjects } from '@/store/projects-store';

import type { LoanFormData } from '@/lib/schemas/loan';

export default function EditLoanPage({
  params,
}: {
  params: Promise<{ loanId: string }>;
}) {
  const resolvedParams = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const { selectedProject } = useProjects();
  const t = useTranslations('dashboard.loans');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch loan data using React Query
  const { data: loan, isLoading } = useQuery({
    queryKey: ['loan', resolvedParams.loanId],
    queryFn: async () => {
      const result = await getLoanAction({ loanId: resolvedParams.loanId });
      if (result.serverError) {
        throw new Error(result.serverError);
      }
      return result.data?.loan;
    },
    enabled: !!resolvedParams.loanId,
  });

  if (!session) {
    return null;
  }

  if (!selectedProject) {
    return null;
  }

  if (isLoading || !loan) {
    return null;
  }

  const handleSubmit = async (data: LoanFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Update the loan using the server action
      const result = await updateLoanAction({ loanId: resolvedParams.loanId, data });

      if (result?.serverError || result?.validationErrors) {
        throw new Error(result.serverError || 'Validation failed');
      }

      const updatedLoan = result?.data?.loan;

      // Show success message
      toast.success(t('edit.form.success'));
      // invalidate the loan query
      if (updatedLoan) {
        queryClient.invalidateQueries({ queryKey: ['lender', updatedLoan.lenderId] });
        // Navigate back to the previous page using the router
        router.push(`/lenders/${updatedLoan.lenderId}?loanId=${updatedLoan.id}`);
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
