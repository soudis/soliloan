import { ViewType } from '@prisma/client';
import { getViewsByType } from '@/actions';
import { getLoansByProjectUnsafe } from '@/actions/loans/queries/get-loans-by-project';
import { getProjectUnsafe } from '@/lib/projects/get-project';
import { LoanTable } from '@/components/loans/loan-table';
import { db } from '@/lib/db';
import { searchParamsCache } from '@/lib/params';
import { resolveTableListViewId } from '@/lib/resolve-table-list-view';
import { TABLE_LIST_PATHS } from '@/lib/table-list-path';

export async function LoansListPage({
  viewId,
  searchParams,
}: {
  viewId?: string;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { projectId } = searchParamsCache.parse(await searchParams);

  const [{ loans }, projectResult, projectWithManagers, viewsResult] = await Promise.all([
    getLoansByProjectUnsafe(projectId),
    getProjectUnsafe(projectId),
    db.project.findUnique({
      where: { id: projectId },
      select: { managers: true },
    }),
    getViewsByType(ViewType.LOAN, projectId),
  ]);

  const views = viewsResult?.views ?? [];
  const resolvedViewId = resolveTableListViewId(viewId, views, TABLE_LIST_PATHS.loans, projectId);

  const project = {
    ...projectResult,
    managers: projectWithManagers?.managers ?? [],
  };
  return (
    <LoanTable loans={loans ?? []} project={project} projectId={projectId} views={views} viewId={resolvedViewId} />
  );
}
