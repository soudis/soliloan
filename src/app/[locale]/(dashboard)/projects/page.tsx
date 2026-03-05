import { ViewType } from '@prisma/client';
import { getProjects, getViewsByType } from '@/actions';
import { ProjectsPageContent } from './projects-page-content';

export default async function ProjectsPage() {
  const viewsResult = await getViewsByType(ViewType.PROJECT);
  const { projects } = await getProjects();
  return <ProjectsPageContent views={viewsResult?.views ?? []} projects={projects} />;
}
