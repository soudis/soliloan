import { redirect } from 'next/navigation';

import { getProjectsAction } from '@/actions/projects/queries/get-projects';
import { auth } from '@/lib/auth';

export default async function DashboardRootPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/login');
  }

  // Get the user's projects and redirect to the first one
  const result = await getProjectsAction();
  const projects = result?.data?.projects ?? [];

  if (projects.length > 0) {
    redirect(`/${projects[0].id}`);
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
