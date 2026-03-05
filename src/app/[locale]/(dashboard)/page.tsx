import { redirect } from 'next/navigation';

import { getProjects } from '@/actions/projects/queries/get-projects';
import { auth } from '@/lib/auth';

interface DashboardRootPageProps {
  params: Promise<{ locale: string }>;
}

export default async function DashboardRootPage({ params }: DashboardRootPageProps) {
  const session = await auth();

  if (!session) {
    redirect('/auth/login');
  }

  const result = await getProjects();
  const projects = result?.projects ?? [];

  if (projects.length > 0) {
    const { locale } = await params;
    redirect(`/${locale}/dashboard?projectId=${projects[0].id}`);
  }

  // If no projects exist, redirect to projects page (for admins) or show empty state
  if (session.user.isAdmin) {
    redirect('/projects');
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">No projects available</h2>
        <p className="text-muted-foreground">Please contact an administrator to get access to a project.</p>
      </div>
    </div>
  );
}
