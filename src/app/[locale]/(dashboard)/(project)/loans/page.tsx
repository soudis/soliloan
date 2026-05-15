import { ViewType } from '@prisma/client';
import { getViewsByType } from '@/actions';
import { getLoansByProjectUnsafe } from '@/actions/loans/queries/get-loans-by-project';
import { getProjectUnsafe } from '@/actions/projects/queries/get-project';
import { LoanTable } from '@/components/loans/loan-table';
import { db } from '@/lib/db';
import { searchParamsCache } from '@/lib/params';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LoansPage({ searchParams }: PageProps) {
  const { projectId } = searchParamsCache.parse(await searchParams);

  const [{ loans }, projectResult, projectWithManagers, views] = await Promise.all([
    getLoansByProjectUnsafe(projectId),
    getProjectUnsafe(projectId),
    db.project.findUnique({
      where: { id: projectId },
      select: { managers: true },
    }),
    getViewsByType(ViewType.LOAN, projectId),
  ]);

  const project = {
    ...projectResult,
    managers: projectWithManagers?.managers ?? [],
  };
  return <LoanTable loans={loans ?? []} project={project} projectId={projectId} views={views?.views ?? []} />;
}
