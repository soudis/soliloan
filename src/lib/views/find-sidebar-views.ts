import { ViewType } from '@prisma/client';
import { db } from '@/lib/db';
import type { SidebarNavView } from '@/types/sidebar-nav';

export async function findSidebarViews(userId: string, projectIds: string[]): Promise<SidebarNavView[]> {
  return db.view.findMany({
    where: {
      showInSidebar: true,
      type: { in: [ViewType.LENDER, ViewType.LOAN, ViewType.TRANSACTION] },
      OR: [{ userId, projectId: null }, ...(projectIds.length > 0 ? [{ projectId: { in: projectIds } }] : [])],
    },
    select: { id: true, name: true, type: true, projectId: true },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });
}
