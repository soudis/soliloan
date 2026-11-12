import { ImportWizard } from '@/components/configuration/import/import-wizard';
import { getLastImportSettingsUnsafe } from '@/lib/import/list-imports';
import { loadImportContextUnsafe } from '@/lib/import/load-import-context';
import { searchParamsCache } from '@/lib/params';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/** Wizard for a new Import. The (project) layout only lets admins and managers of the project in. */
export default async function ImportPage({ searchParams }: PageProps) {
  const { projectId } = searchParamsCache.parse(await searchParams);
  const [context, lastSettings] = await Promise.all([
    loadImportContextUnsafe(projectId),
    getLastImportSettingsUnsafe(projectId),
  ]);

  return <ImportWizard projectId={projectId} context={context} lastSettings={lastSettings} />;
}
