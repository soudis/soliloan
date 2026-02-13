import { notFound } from 'next/navigation';

import { getLenderAction } from '@/actions';
import { EditLenderClient } from '@/components/lenders/edit-lender-client';

interface PageProps {
  params: Promise<{ projectId: string; lenderId: string }>;
}

export default async function EditLenderPage({ params }: PageProps) {
  const { projectId, lenderId } = await params;

  const result = await getLenderAction({ lenderId });

  if (result.serverError || !result.data?.lender) {
    notFound();
  }

  return <EditLenderClient lender={result.data.lender} projectId={projectId} />;
}
