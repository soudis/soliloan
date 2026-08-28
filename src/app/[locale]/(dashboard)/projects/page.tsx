import { ViewType } from '@prisma/client';
import { getViewsByType } from '@/actions';
import { getProjects } from '@/lib/projects/get-projects';
import { requireSession } from '@/lib/require-session';
import { ProjectsPageContent } from './projects-page-content';

export default async function ProjectsPage() {
  const session = await requireSession();
  const viewsResult = await getViewsByType(ViewType.PROJECT);
  const { projects } = await getProjects(session);
  return <ProjectsPageContent views={viewsResult?.views ?? []} projects={projects} />;
}
