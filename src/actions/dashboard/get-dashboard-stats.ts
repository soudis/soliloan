'use server';

import { loadDashboardStats } from '@/lib/dashboard/load-dashboard-stats';
import { requireSession } from '@/lib/require-session';
import { assertCanManageProject } from '@/lib/views/access';

export type { DashboardLender, DashboardLoan } from '@/lib/dashboard/load-dashboard-stats';

export async function getDashboardStats(projectId: string, toDate: Date = new Date()) {
  try {
    const session = await requireSession();
    const userId = session.user.id;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      await assertCanManageProject(projectId, userId, session.user.isAdmin ?? false);
    } catch {
      return { error: 'You do not have access to this project' };
    }

    return await loadDashboardStats(projectId, toDate);
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return { error: 'Failed to get dashboard stats' };
  }
}
