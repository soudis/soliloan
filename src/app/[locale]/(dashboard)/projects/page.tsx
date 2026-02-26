import { ViewType } from '@prisma/client';
import { getProjectsAction, getViewsByType } from '@/actions';
import { ProjectsPageContent } from './projects-page-content';

export default async function ProjectsPage() {
  const viewsResult = await getViewsByType(ViewType.PROJECT);
  const projectsResult = await getProjectsAction();
  return <ProjectsPageContent views={viewsResult?.views ?? []} projects={projectsResult?.data?.projects ?? []} />;
}
