'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { findSidebarViews } from '@/lib/views/find-sidebar-views';
import type { SidebarNavView } from '@/types/sidebar-nav';

/** Client-refetchable sidebar pins (same access scope as `getProjects`). */
export async function getSidebarViews(): Promise<SidebarNavView[]> {
  const session = await auth();
  const userId = session?.user.id;
  if (!userId) return [];

  const projects = await db.project.findMany({
    ...(!session.user.isAdmin && {
      where: {
        managers: {
          some: { id: userId },
        },
      },
    }),
    select: { id: true },
  });

  return findSidebarViews(
    userId,
    projects.map((p) => p.id),
  );
}
