'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function revalidateProject(projectId: string) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    // Check if the user has access to the project
    const project = await db.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        managers: true,
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

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error('Error revalidating project:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to revalidate project',
    };
  }
}
