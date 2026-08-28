import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getProjects } from '@/actions/projects/queries/get-projects';
import { firstAccessibleProjectId, LAST_PROJECT_COOKIE_NAME, parseLastProjectCookie } from '@/lib/last-project-cookie';
import { PROJECT_ID_KEY } from '@/lib/params';
import { requireSession } from '@/lib/require-session';

interface DashboardRootPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardRootPage({ params, searchParams }: DashboardRootPageProps) {
  const session = await requireSession();

  const result = await getProjects(session);
  const projects = result?.projects ?? [];
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;

  if (projects.length > 0) {
    const projectIdFromUrl =
      typeof resolvedSearchParams[PROJECT_ID_KEY] === 'string' ? resolvedSearchParams[PROJECT_ID_KEY] : undefined;
    const cookieStore = await cookies();
    const lastProjectId = parseLastProjectCookie(cookieStore.get(LAST_PROJECT_COOKIE_NAME)?.value, session.user.id);
    const preferredProjectId =
      firstAccessibleProjectId(
        [projectIdFromUrl, lastProjectId, projects[0].id],
        projects.map((p) => p.id),
      ) ?? projects[0].id;

    redirect(`/${locale}/dashboard?projectId=${preferredProjectId}`);
  }

  if (!session.user.isManager && session.user.loanedToProjects.length > 0) {
    redirect(`/${locale}/my-loans`);
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
