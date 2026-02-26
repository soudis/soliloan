import { ViewType } from '@prisma/client';
import { getViewsByType } from '@/actions';
import { getLendersByProjectAction } from '@/actions/lenders';
import { getProjectUnsafe } from '@/actions/projects/queries/get-project';
import { LenderTable } from '@/components/lenders/lender-table';
import { db } from '@/lib/db';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function LendersPage({ params }: PageProps) {
  const { projectId } = await params;

  const [lendersResult, projectResult, projectWithManagers, views] = await Promise.all([
    getLendersByProjectAction({ projectId }),
    getProjectUnsafe(projectId),
    db.project.findUnique({
      where: { id: projectId },
      select: { managers: true },
    }),
    getViewsByType(ViewType.LENDER),
  ]);

  const lenders = lendersResult.data?.lenders ?? [];
  const project = {
    ...projectResult.project,
    managers: projectWithManagers?.managers ?? [],
  };

  return <LenderTable lenders={lenders} project={project} projectId={projectId} views={views?.views ?? []} />;
}
