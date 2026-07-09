import { getTranslations } from 'next-intl/server';

import { getDashboardStats } from '@/actions/dashboard/get-dashboard-stats';
import { getDashboardLayoutsForPage } from '@/actions/dashboard/queries/get-dashboard-layouts';
import { getProjectUnsafe } from '@/actions/projects/queries/get-project';
import { DashboardCustomizer } from '@/components/dashboard/customizer/dashboard-customizer';
import { DashboardDataProvider } from '@/components/dashboard/dashboard-data-provider';
import { createDefaultLayoutData } from '@/lib/dashboard/layout-utils';
import { searchParamsCache } from '@/lib/params';
import { requireSession } from '@/lib/require-session';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { projectId } = searchParamsCache.parse(await searchParams);

  const [layoutResult, statsResult, project, session] = await Promise.all([
    getDashboardLayoutsForPage(projectId),
    getDashboardStats(projectId),
    getProjectUnsafe(projectId),
    requireSession(),
  ]);

  const isAdmin = session.user.isAdmin;

  const fallback = createDefaultLayoutData();
  const projectLayout = layoutResult.error ? fallback : (layoutResult.project?.layout ?? fallback);
  const userLayout = layoutResult.error ? fallback : (layoutResult.user?.layout ?? fallback);

  if (!project || 'error' in statsResult || !statsResult.loans || !statsResult.lenders || !statsResult.toDate) {
    const t = await getTranslations('dashboard.page');
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">{t('loadError')}</p>
      </div>
    );
  }

  return (
    <DashboardDataProvider
      key={projectId}
      loans={statsResult.loans}
      lenders={statsResult.lenders}
      toDate={new Date(statsResult.toDate)}
      project={project}
    >
      <DashboardCustomizer
        key={projectId}
        projectId={projectId}
        initialProjectLayout={projectLayout}
        initialUserLayout={userLayout}
        isAdmin={isAdmin}
      />
    </DashboardDataProvider>
  );
}
