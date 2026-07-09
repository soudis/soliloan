'use server';

import { getProjects } from '@/actions/projects/queries/get-projects';
import DashboardNavigation from '@/components/dashboard/dashboard-navigation';
import { requireSession } from '@/lib/require-session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  const { projects, sidebarViews } = await getProjects(session);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <DashboardNavigation session={session} projects={projects} sidebarViews={sidebarViews}>
        {children}
      </DashboardNavigation>
    </div>
  );
}
