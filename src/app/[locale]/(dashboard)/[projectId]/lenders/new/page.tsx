import { NewLenderClient } from '@/components/lenders/new-lender-client';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function NewLenderPage({ params }: PageProps) {
  const { projectId } = await params;

  return <NewLenderClient projectId={projectId} />;
}
