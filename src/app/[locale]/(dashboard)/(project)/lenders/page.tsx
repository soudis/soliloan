import { ViewType } from '@prisma/client';
import { getViewsByType } from '@/actions';
import { getLendersByProjectIdUnsafe } from '@/actions/lenders/queries/get-lenders-by-project';
import { LenderTable } from '@/components/lenders/lender-table';
import { searchParamsCache } from '@/lib/params';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LendersPage({ searchParams }: PageProps) {
  const { projectId } = searchParamsCache.parse(await searchParams);

  const [lendersResult, views] = await Promise.all([
    getLendersByProjectIdUnsafe(projectId),
    getViewsByType(ViewType.LENDER),
  ]);

  const lenders = lendersResult.lenders ?? [];

  return <LenderTable lenders={lenders} views={views?.views ?? []} />;
}
