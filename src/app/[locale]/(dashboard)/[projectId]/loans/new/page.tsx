import { getLenderAction } from '@/actions';
import { NewLoanClient } from '@/components/loans/new-loan-client';

interface PageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ lenderId?: string }>;
}

export default async function NewLoanPage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const { lenderId } = await searchParams;

  let lender = null;
  if (lenderId) {
    const result = await getLenderAction({ lenderId });
    if (!result.serverError && result.data?.lender) {
      lender = result.data.lender;
    }
  }

  return <NewLoanClient projectId={projectId} lender={lender} lenderId={lenderId} />;
}
