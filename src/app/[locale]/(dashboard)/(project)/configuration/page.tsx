import { getProjectUnsafe } from '@/actions/projects/queries/get-project';
import { ConfigurationPage } from '@/components/configuration/configuration-page';
import { db } from '@/lib/db';
import { searchParamsCache } from '@/lib/params';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ConfigPage({ searchParams }: PageProps) {
  const { projectId } = searchParamsCache.parse(await searchParams);

  const result = await getProjectUnsafe(projectId);
  const projectWithManagers = await db.project.findUnique({
    where: { id: projectId },
    select: { managers: true },
  });

  const project = {
    ...result,
    managers: projectWithManagers?.managers ?? [],
  };

  return <ConfigurationPage project={project} />;
}
