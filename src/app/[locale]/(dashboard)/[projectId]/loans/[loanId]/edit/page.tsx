import { notFound } from 'next/navigation';

import { getLoanAction } from '@/actions/loans';
import { getProjectUnsafe } from '@/actions/projects/queries/get-project';
import { EditLoanClient } from '@/components/loans/edit-loan-client';

interface PageProps {
  params: Promise<{ projectId: string; loanId: string }>;
}

export default async function EditLoanPage({ params }: PageProps) {
  const { projectId, loanId } = await params;

  const [loanResult, projectResult] = await Promise.all([getLoanAction({ loanId }), getProjectUnsafe(projectId)]);

  if (loanResult.serverError || !loanResult.data?.loan) {
    notFound();
  }

  return <EditLoanClient loan={loanResult.data.loan} project={projectResult.project} />;
}
