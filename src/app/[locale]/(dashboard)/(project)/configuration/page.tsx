import { getProjectUnsafe } from '@/actions/projects/queries/get-project';
import { ConfigurationPage } from '@/components/configuration/configuration-page';
import { db } from '@/lib/db';
import { getProjectSystemTemplatesOverviewRows } from '@/lib/templates/project-system-templates-overview';
import { getInviteValidDays } from '@/lib/env';
import { searchParamsCache } from '@/lib/params';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ConfigPage({ searchParams }: PageProps) {
  const { projectId } = searchParamsCache.parse(await searchParams);

  const [result, projectWithManagers, systemTemplatesOverviewRows] = await Promise.all([
    getProjectUnsafe(projectId),
    db.project.findUnique({
      where: { id: projectId },
      select: { managers: true },
    }),
    getProjectSystemTemplatesOverviewRows(projectId),
  ]);

  const project = {
    ...result,
    managers: projectWithManagers?.managers ?? [],
  };

  return (
    <ConfigurationPage
      project={project}
      inviteValidDays={getInviteValidDays()}
      systemTemplatesOverviewRows={systemTemplatesOverviewRows}
    />
  );
}
