import { getLenderAction, getProjectUnsafe } from '@/actions';
import { NewLoanClient } from '@/components/loans/new-loan-client';
import { searchParamsCache } from '@/lib/params';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NewLoanPage({ searchParams }: PageProps) {
  const resolved = await searchParams;
  const { projectId } = searchParamsCache.parse(resolved);
  const lenderId = typeof resolved?.lenderId === 'string' ? resolved.lenderId : undefined;

  const projectResult = await getProjectUnsafe(projectId);

  let lender = null;
  if (lenderId) {
    const lenderResult = await getLenderAction({ lenderId });
    if (!lenderResult.serverError && lenderResult.data?.lender) {
      lender = lenderResult.data.lender;
    }
  }

  return <NewLoanClient project={projectResult} lender={lender} lenderId={lenderId} />;
}
