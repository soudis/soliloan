import { notFound } from 'next/navigation';

import { getLoanAction } from '@/actions/loans';
import { getProjectUnsafe } from '@/actions/projects/queries/get-project';
import { EditLoanClient } from '@/components/loans/edit-loan-client';
import { searchParamsCache } from '@/lib/params';

interface PageProps {
  params: Promise<{ loanId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EditLoanPage({ params, searchParams }: PageProps) {
  const { loanId } = await params;
  const { projectId } = searchParamsCache.parse(await searchParams);

  const [loanResult, projectResult] = await Promise.all([getLoanAction({ loanId }), getProjectUnsafe(projectId)]);

  if (loanResult.serverError || !loanResult.data?.loan) {
    notFound();
  }

  return <EditLoanClient loan={loanResult.data.loan} project={projectResult} />;
}
