import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getProjectUnsafe } from '@/actions/projects';
import { ProjectProvider } from '@/components/providers/project-provider';
import { requiereManagerOfProject } from '@/lib/require-session';

export default async function ProjectLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const url = new URL(headersList.get('x-url') ?? '');
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    notFound();
  }

  await requiereManagerOfProject(projectId);

  const project = (await getProjectUnsafe(projectId)) ?? null;

  return <ProjectProvider project={project}>{children}</ProjectProvider>;
}
