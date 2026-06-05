import { getDashboardStats } from '@/actions/dashboard/get-dashboard-stats';
import { getDashboardLayoutsForPage } from '@/actions/dashboard/queries/get-dashboard-layouts';
import { getProjectUnsafe } from '@/actions/projects/queries/get-project';
import { DashboardCustomizer } from '@/components/dashboard/customizer/dashboard-customizer';
import { DashboardDataProvider } from '@/components/dashboard/dashboard-data-provider';
import { createDefaultLayoutData } from '@/lib/dashboard/layout-utils';
import { searchParamsCache } from '@/lib/params';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { projectId } = searchParamsCache.parse(await searchParams);

  const [layoutResult, statsResult, project] = await Promise.all([
    getDashboardLayoutsForPage(projectId),
    getDashboardStats(projectId),
    getProjectUnsafe(projectId),
  ]);

  const fallback = createDefaultLayoutData();
  const projectLayout = layoutResult.error ? fallback : (layoutResult.project?.layout ?? fallback);
  const userLayout = layoutResult.error ? fallback : (layoutResult.user?.layout ?? fallback);

  if ('error' in statsResult && statsResult.error) {
    return null;
  }
  if (!project || !('loans' in statsResult) || !statsResult.loans || !statsResult.toDate) {
    return null;
  }

  return (
    <DashboardDataProvider
      key={projectId}
      loans={statsResult.loans}
      toDate={new Date(statsResult.toDate)}
      project={project}
    >
      <DashboardCustomizer
        key={projectId}
        projectId={projectId}
        initialProjectLayout={projectLayout}
        initialUserLayout={userLayout}
      />
    </DashboardDataProvider>
  );
}
