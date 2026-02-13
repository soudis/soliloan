import { getLenderAction, getProjectUnsafe } from '@/actions';
import { NewLoanClient } from '@/components/loans/new-loan-client';

interface PageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ lenderId?: string }>;
}

export default async function NewLoanPage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const { lenderId } = await searchParams;

  const projectResult = await getProjectUnsafe(projectId);

  let lender = null;
  if (lenderId) {
    const lenderResult = await getLenderAction({ lenderId });
    if (!lenderResult.serverError && lenderResult.data?.lender) {
      lender = lenderResult.data.lender;
    }
  }

  return <NewLoanClient project={projectResult.project} lender={lender} lenderId={lenderId} />;
}
