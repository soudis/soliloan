import { ViewType } from '@prisma/client';
import { getProjects } from '@/lib/projects/get-projects';
import { requireSession } from '@/lib/require-session';
import { getViewsByType } from '@/lib/views/get-views';
import { ProjectsPageContent } from './projects-page-content';

export default async function ProjectsPage() {
  const session = await requireSession();
  const viewsResult = await getViewsByType(ViewType.PROJECT);
  const { projects } = await getProjects(session);
  return <ProjectsPageContent views={viewsResult?.views ?? []} projects={projects} />;
}
