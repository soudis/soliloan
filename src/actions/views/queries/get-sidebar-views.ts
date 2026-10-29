'use server';

import { db } from '@/lib/db';
import { authAction } from '@/lib/utils/safe-action';
import { findSidebarViews } from '@/lib/views/find-sidebar-views';

/** Client-refetchable sidebar pins (same access scope as `getProjects`). */
export const getSidebarViewsAction = authAction.action(async ({ ctx }) => {
  const { id: userId, isAdmin } = ctx.session.user;
  if (!userId) {
    throw new Error('error.unauthorized');
  }

  const projects = await db.project.findMany({
    ...(!isAdmin && {
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
});
