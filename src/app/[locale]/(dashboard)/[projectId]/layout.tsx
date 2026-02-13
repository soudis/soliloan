import { redirect } from 'next/navigation';

import { getProjectUnsafe } from '@/actions/projects/queries/get-project';
import { ProjectProvider } from '@/components/providers/project-provider';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import type { ProjectWithConfiguration } from '@/types/projects';

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;
  const session = await auth();

  if (!session) {
    redirect('/auth/login');
  }

  // Verify user has access to this project
  const hasAccess =
    session.user.isAdmin ||
    (await db.project.findFirst({
      where: {
        id: projectId,
        managers: {
          some: {
            id: session.user.id,
          },
        },
      },
      select: { id: true },
    }));

  if (!hasAccess) {
    redirect('/projects');
  }

  // Load the project with configuration
  let project: ProjectWithConfiguration;
  try {
    const result = await getProjectUnsafe(projectId);
    project = result.project;
  } catch {
    redirect('/projects');
  }

  // Add managers to the project (getProjectUnsafe doesn't include them)
  const projectWithManagers = await db.project.findUnique({
    where: { id: projectId },
    select: {
      managers: true,
    },
  });

  const fullProject = {
    ...project,
    managers: projectWithManagers?.managers ?? [],
  };

  return <ProjectProvider project={fullProject}>{children}</ProjectProvider>;
}
