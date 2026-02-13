'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { getLenderAction } from '@/actions';
import { createLoanAction } from '@/actions/loans';
import { LoanForm } from '@/components/loans/loan-form';
import { useRouter } from '@/i18n/navigation';
import type { LoanFormData } from '@/lib/schemas/loan';
import { getLenderName } from '@/lib/utils';
import type { LenderWithCalculations } from '@/types/lenders';

interface NewLoanClientProps {
  projectId: string;
  lender?: LenderWithCalculations | null;
  lenderId?: string | null;
}

export function NewLoanClient({ projectId, lender, lenderId }: NewLoanClientProps) {
  const router = useRouter();
  const t = useTranslations('dashboard.loans');
  const commonT = useTranslations('common');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: LoanFormData) => {
    try {
      setIsSubmitting(true);

      // Get the lender details first
      const lenderResult = await getLenderAction({ lenderId: data.lenderId });
      if (lenderResult.serverError) {
        throw new Error(lenderResult.serverError);
      }

      if (!lenderResult.data?.lender) {
        throw new Error('Lender not found');
      }

      const result = await createLoanAction({ ...data, lenderId: data.lenderId });

      if (result?.serverError || result?.validationErrors) {
        throw new Error(result.serverError || 'Validation failed');
      }

      const loan = result?.data?.loan;

      toast.success(t('new.form.success'));
      if (loan) {
        router.push(`/${projectId}/lenders/${loan.lenderId}?loanId=${loan.id}`);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      toast.error(t('new.form.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialData = lenderId
    ? {
        lenderId,
      }
    : undefined;

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
