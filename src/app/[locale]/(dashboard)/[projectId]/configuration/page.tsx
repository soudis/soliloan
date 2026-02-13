import { getProjectUnsafe } from '@/actions/projects/queries/get-project';
import { ConfigurationPage } from '@/components/configuration/configuration-page';
import { db } from '@/lib/db';

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ConfigPage({ params }: PageProps) {
  const { projectId } = await params;

  const result = await getProjectUnsafe(projectId);
  const projectWithManagers = await db.project.findUnique({
    where: { id: projectId },
    select: { managers: true },
  });

  const project = {
    ...result.project,
    managers: projectWithManagers?.managers ?? [],
  };

  return <ConfigurationPage project={project} />;
}
