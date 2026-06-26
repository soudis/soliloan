import { ViewType } from '@prisma/client';
import { getViewsByType } from '@/actions';
import { getProjectUnsafe } from '@/actions/projects/queries/get-project';
import { getTransactionsByProjectUnsafe } from '@/actions/transactions/queries/get-transactions-by-project';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { db } from '@/lib/db';
import { searchParamsCache } from '@/lib/params';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const { projectId } = searchParamsCache.parse(await searchParams);

  const [{ transactions }, projectResult, projectWithManagers, views] = await Promise.all([
    getTransactionsByProjectUnsafe(projectId),
    getProjectUnsafe(projectId),
    db.project.findUnique({
      where: { id: projectId },
      select: { managers: true },
    }),
    getViewsByType(ViewType.TRANSACTION, projectId),
  ]);

  const project = {
    ...projectResult,
    managers: projectWithManagers?.managers ?? [],
  };

  return (
    <TransactionTable
      transactions={transactions ?? []}
      project={project}
      projectId={projectId}
      views={views?.views ?? []}
    />
  );
}
