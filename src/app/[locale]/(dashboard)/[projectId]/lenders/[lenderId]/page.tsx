import { notFound } from 'next/navigation';

import { getLenderAction } from '@/actions';
import { LenderPage } from '@/components/lenders/lender-page';

interface PageProps {
  params: Promise<{ projectId: string; lenderId: string }>;
}

export default async function LenderDetailsPage({ params }: PageProps) {
  const { lenderId } = await params;

  const result = await getLenderAction({ lenderId });

  if (result.serverError || !result.data?.lender) {
    notFound();
  }

  return <LenderPage lender={result.data.lender} />;
}
