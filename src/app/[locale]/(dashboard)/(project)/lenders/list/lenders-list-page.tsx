import { ViewType } from '@prisma/client';
import { getViewsByType } from '@/actions';
import { getLendersByProjectIdUnsafe } from '@/actions/lenders/queries/get-lenders-by-project';
import { LenderTable } from '@/components/lenders/lender-table';
import { searchParamsCache } from '@/lib/params';
import { resolveTableListViewId } from '@/lib/resolve-table-list-view';
import { TABLE_LIST_PATHS } from '@/lib/table-list-path';

export async function LendersListPage({
  viewId,
  searchParams,
}: {
  viewId?: string;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { projectId } = searchParamsCache.parse(await searchParams);

  const [lendersResult, viewsResult] = await Promise.all([
    getLendersByProjectIdUnsafe(projectId),
    getViewsByType(ViewType.LENDER, projectId),
  ]);

  const views = viewsResult?.views ?? [];
  const resolvedViewId = resolveTableListViewId(viewId, views, TABLE_LIST_PATHS.lenders, projectId);
  const lenders = lendersResult.lenders ?? [];

  return <LenderTable lenders={lenders} views={views} viewId={resolvedViewId} />;
}
