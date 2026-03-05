'use server';

import { getProjects } from '@/actions/projects/queries/get-projects';
import DashboardNavigation from '@/components/dashboard/dashboard-navigation';
import { auth } from '@/lib/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const { projects } = await getProjects();

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavigation session={session} projects={projects}>
        <div className="h-full">{children}</div>
      </DashboardNavigation>
    </div>
  );
}
