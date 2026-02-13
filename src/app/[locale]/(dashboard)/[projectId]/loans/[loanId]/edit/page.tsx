import { notFound } from 'next/navigation';

import { getLoanAction } from '@/actions/loans';
import { EditLoanClient } from '@/components/loans/edit-loan-client';

interface PageProps {
  params: Promise<{ projectId: string; loanId: string }>;
}

export default async function EditLoanPage({ params }: PageProps) {
  const { projectId, loanId } = await params;

  const result = await getLoanAction({ loanId });

  if (result.serverError || !result.data?.loan) {
    notFound();
  }

  return <EditLoanClient loan={result.data.loan} projectId={projectId} />;
}
