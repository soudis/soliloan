import { getDashboardLayoutsForPage } from '@/actions/dashboard/queries/get-dashboard-layouts';
import { DashboardCustomizer } from '@/components/dashboard/customizer/dashboard-customizer';
import { createDefaultLayoutData } from '@/lib/dashboard/layout-utils';
import { searchParamsCache } from '@/lib/params';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { projectId } = searchParamsCache.parse(await searchParams);

  const result = await getDashboardLayoutsForPage(projectId);

  const fallback = createDefaultLayoutData();
  const projectLayout = result.error ? fallback : (result.project?.layout ?? fallback);
  const userLayout = result.error ? fallback : (result.user?.layout ?? fallback);

  return (
    <DashboardCustomizer
      projectId={projectId}
      initialProjectLayout={projectLayout}
      initialUserLayout={userLayout}
    />
  );
}
