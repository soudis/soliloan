'use server';

import { getGlobalDefaultLayout, resolveScopedLayout } from '@/lib/dashboard/layout-db';
import { auth } from '@/lib/auth';
import { assertCanManageProject } from '@/lib/views/access';
import type { DashboardLayoutData } from '@/types/dashboard-layout';

export type ResolvedDashboardLayout = {
  layout: DashboardLayoutData;
  isPersisted: boolean;
};

export async function getDashboardLayoutsForPage(projectId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    const userId = session.user.id;
    const isAdmin = session.user.isAdmin ?? false;

    await assertCanManageProject(projectId, userId, isAdmin);

    const [globalDefault, project, user] = await Promise.all([
      getGlobalDefaultLayout(),
      resolveScopedLayout('PROJECT', projectId),
      resolveScopedLayout('USER', userId),
    ]);

    return {
      globalDefault,
      project,
      user,
    };
  } catch (error) {
    console.error('Error fetching dashboard layouts:', error);
    return { error: 'Failed to fetch dashboard layouts' };
  }
}
