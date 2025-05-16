'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { getLenderById } from '@/app/actions/lenders';
import { createLoan } from '@/app/actions/loans';
import { LoanForm } from '@/components/loans/loan-form';
import { useRouter } from '@/i18n/navigation';
import { getLenderName } from '@/lib/utils';
import { useProject } from '@/store/project-context';

import type { LoanFormData } from '@/lib/schemas/loan';

export default function NewLoanPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedProject } = useProject();
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get the lenderId from the URL search params
  const lenderId = searchParams.get('lenderId');

  // Fetch lender data using React Query if lenderId is provided
  const { data: lender, isLoading: lenderLoading } = useQuery({
    queryKey: ['lender', lenderId],
    queryFn: async () => {
      if (!lenderId) return null;
      const result = await getLenderById(lenderId);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.lender;
    },
    enabled: !!lenderId,
  });

  if (!session) {
    return null;
  }

  if (!selectedProject) {
    return null;
  }

  if (lenderLoading) {
    return null;
  }

  const handleSubmit = async (data: LoanFormData) => {
    try {
      setIsSubmitting(true);
      // Get the lender details first
      const lenderResult = await getLenderById(data.lenderId);
      if (lenderResult.error) {
        throw new Error(lenderResult.error);
      }

      if (!lenderResult.lender) {
        throw new Error('Lender not found');
      }

      // Create the loan using the server action
      const result = await createLoan(data);

      if (result.error) {
        throw new Error(result.error);
      }

      // Show success message
      toast.success(t('new.form.success'));

      // Redirect to the loans list page for this project
      router.push(`/lenders/${result.loan?.lenderId}?highlightLoan=${result.loan?.id}`);
    } catch (error) {
      console.error('Error submitting form:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      toast.error(t('new.form.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set up initial data with required fields based on the default termination type
  const initialData = lenderId
    ? {
        lenderId,
      }
    : undefined;

  // Format the title based on whether we have lender data
  const title = lender
    ? t('new.titleWithLender', {
        lenderName: getLenderName(lender),
      })
    : t('new.title');

  return (
    <LoanForm
      title={title}
      submitButtonText={commonT('ui.actions.create')}
      submittingButtonText={commonT('ui.actions.creating')}
      cancelButtonText={commonT('ui.actions.cancel')}
      onSubmit={handleSubmit}
      error={error}
      initialData={initialData}
      isLoading={isSubmitting}
    />
  );
}
