import { ViewType } from '@prisma/client';
import { getViewsByType } from '@/actions';
import { getLinkedBankConnection } from '@/actions/gocardless/queries/get-import-batch';
import { getProjectUnsafe } from '@/lib/projects/get-project';
import { getTransactionsByProjectUnsafe } from '@/actions/transactions/queries/get-transactions-by-project';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { db } from '@/lib/db';
import { searchParamsCache } from '@/lib/params';
import { resolveTableListViewId } from '@/lib/resolve-table-list-view';
import { TABLE_LIST_PATHS } from '@/lib/table-list-path';

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
