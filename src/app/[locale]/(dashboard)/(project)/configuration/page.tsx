import { getProjectUnsafe } from '@/actions/projects/queries/get-project';
import { ConfigurationPage } from '@/components/configuration/configuration-page';
import { db } from '@/lib/db';
import { getInviteValidDays } from '@/lib/env';
import { countGermanLoans } from '@/lib/investment-types/count-german-loans';
import { searchParamsCache } from '@/lib/params';
import { getProjectSystemTemplatesOverviewRows } from '@/lib/templates/project-system-templates-overview';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ConfigPage({ searchParams }: PageProps) {
  const { projectId } = searchParamsCache.parse(await searchParams);

  const [result, projectWithManagers, systemTemplatesOverviewRows, germanLoansCount] = await Promise.all([
    getProjectUnsafe(projectId),
    db.project.findUnique({
      where: { id: projectId },
      select: { managers: true },
    }),
    getProjectSystemTemplatesOverviewRows(projectId),
    countGermanLoans(db, projectId),
  ]);

  const project = {
    ...result,
    managers: projectWithManagers?.managers ?? [],
  };

  return (
    <ConfigurationPage
      project={project}
      germanLoansCount={germanLoansCount}
      inviteValidDays={getInviteValidDays()}
      systemTemplatesOverviewRows={systemTemplatesOverviewRows}
    />
  );
}
