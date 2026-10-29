import { ViewType } from '@prisma/client';
import { getLinkedBankConnection } from '@/actions/gocardless/queries/get-import-batch';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { db } from '@/lib/db';
import { searchParamsCache } from '@/lib/params';
import { getProjectUnsafe } from '@/lib/projects/get-project';
import { resolveTableListViewId } from '@/lib/resolve-table-list-view';
import { TABLE_LIST_PATHS } from '@/lib/table-list-path';
import { getTransactionsByProjectUnsafe } from '@/lib/transactions/get-transactions-by-project';
import { getViewsByType } from '@/lib/views/get-views';

export async function TransactionsListPage({
  viewId,
  searchParams,
}: {
  viewId?: string;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { projectId } = searchParamsCache.parse(await searchParams);

  const [{ transactions }, projectResult, projectWithManagers, viewsResult, connection] = await Promise.all([
    getTransactionsByProjectUnsafe(projectId),
    getProjectUnsafe(projectId),
    db.project.findUnique({
      where: { id: projectId },
      select: { managers: true },
    }),
    getViewsByType(ViewType.TRANSACTION, projectId),
    getLinkedBankConnection(projectId),
  ]);

  const views = viewsResult?.views ?? [];
  const resolvedViewId = resolveTableListViewId(viewId, views, TABLE_LIST_PATHS.transactions, projectId);

  const project = {
    ...projectResult,
    managers: projectWithManagers?.managers ?? [],
  };

  return (
    <TransactionTable
      transactions={transactions ?? []}
      project={project}
      projectId={projectId}
      views={views}
      viewId={resolvedViewId}
      hasBankConnection={Boolean(connection)}
    />
  );
}
