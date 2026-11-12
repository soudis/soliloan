import { getBankConnections } from '@/actions/gocardless/queries/get-bank-connections';
import { ConfigurationPage } from '@/components/configuration/configuration-page';
import { db } from '@/lib/db';
import { getInviteValidDays } from '@/lib/env';
import { listImportsUnsafe } from '@/lib/import/list-imports';
import { countGermanLoans } from '@/lib/investment-types/count-german-loans';
import { searchParamsCache } from '@/lib/params';
import { getProjectUnsafe } from '@/lib/projects/get-project';
import { getProjectSystemTemplatesOverviewRows } from '@/lib/templates/project-system-templates-overview';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ConfigPage({ searchParams }: PageProps) {
  const { projectId } = searchParamsCache.parse(await searchParams);

  const [result, projectWithManagers, systemTemplatesOverviewRows, germanLoansCount, bankConnections, imports] =
    await Promise.all([
      getProjectUnsafe(projectId),
      db.project.findUnique({
        where: { id: projectId },
        select: { managers: true },
      }),
      getProjectSystemTemplatesOverviewRows(projectId),
      countGermanLoans(db, projectId),
      getBankConnections(projectId),
      listImportsUnsafe(projectId),
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
      bankConnections={bankConnections}
      imports={imports}
    />
  );
}
