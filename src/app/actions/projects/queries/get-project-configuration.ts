'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function getProjectConfiguration(projectId: string) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    // Fetch the project
    const project = await db.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        managers: true,
        configuration: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Check if the user has access to the project
    const hasAccess = project.managers.some((manager) => manager.id === session.user.id);

    if (!hasAccess) {
      throw new Error('You do not have access to this project');
    }

    return { configuration: project.configuration };
  } catch (error) {
    console.error('Error fetching project configuration:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch project configuration',
    };
  }
}
