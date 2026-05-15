'use server';

import type { Prisma, ViewType } from '@prisma/client';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assertCanManageProject } from '@/lib/views/access';

export async function getViewsByType(viewType: ViewType, projectId?: string | null) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const userId = session.user?.id;
    if (!userId) {
      throw new Error('Unauthorized');
    }
    const isAdmin = session.user.isAdmin ?? false;

    if (projectId) {
      await assertCanManageProject(projectId, userId, isAdmin);
    }

    const or: Prisma.ViewWhereInput[] = [{ userId, projectId: null }];
    if (projectId) {
      or.push({ projectId });
    }

    const views = await db.view.findMany({
      where: {
        type: viewType,
        OR: or,
      },
      orderBy: [{ projectId: 'asc' }, { name: 'asc' }],
    });

    return { views };
  } catch (error) {
    console.error('Error fetching views:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch views',
    };
  }
}
