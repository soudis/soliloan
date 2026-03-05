import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getProjectUnsafe } from '@/actions/projects';
import { ProjectProvider } from '@/components/providers/project-provider';
import { auth } from '@/lib/auth';

export default async function ProjectLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const url = new URL(headersList.get('x-url') ?? '');
  const projectId = url.searchParams.get('projectId');
  const session = await auth();

  if (!session) {
    redirect('/auth/login');
  }

  if (!projectId) {
    notFound();
  }

  if (!session.user.isAdmin && !session.user.managerOf.includes(projectId)) {
    notFound();
  }

  const project = (await getProjectUnsafe(projectId)) ?? null;

  return <ProjectProvider project={project}>{children}</ProjectProvider>;
}
