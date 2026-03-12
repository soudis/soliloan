import { NewLenderClient } from '@/components/lenders/new-lender-client';
import { searchParamsCache } from '@/lib/params';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function NewLenderPage({ searchParams }: PageProps) {
  const { projectId } = searchParamsCache.parse(await searchParams);

  return <NewLenderClient projectId={projectId} />;
}
