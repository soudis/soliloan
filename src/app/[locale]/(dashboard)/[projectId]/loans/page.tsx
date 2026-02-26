import { ViewType } from '@prisma/client';
import { getLoansByProjectAction, getViewsByType } from '@/actions';
import { getProjectUnsafe } from '@/actions/projects/queries/get-project';
import { LoanTable } from '@/components/loans/loan-table';
import { db } from '@/lib/db';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function LoansPage({ params }: PageProps) {
  const { projectId } = await params;

  const [loansResult, projectResult, projectWithManagers, views] = await Promise.all([
    getLoansByProjectAction({ projectId }),
    getProjectUnsafe(projectId),
    db.project.findUnique({
      where: { id: projectId },
      select: { managers: true },
    }),
    getViewsByType(ViewType.LOAN),
  ]);

  const loans = loansResult.data?.loans ?? [];
  const project = {
    ...projectResult.project,
    managers: projectWithManagers?.managers ?? [],
  };

  return <LoanTable loans={loans} project={project} projectId={projectId} views={views?.views ?? []} />;
}
