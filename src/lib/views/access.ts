import type { View } from '@prisma/client';

import { db } from '@/lib/db';

/** Any project manager or admin may manage project-scoped views. */
export async function assertCanManageProject(projectId: string, userId: string, isAdmin: boolean): Promise<void> {
  if (isAdmin) return;
  const n = await db.project.count({
    where: { id: projectId, managers: { some: { id: userId } } },
  });
  if (n === 0) {
    throw new Error('error.unauthorized');
  }
}

export async function assertCanModifyView(
  view: Pick<View, 'userId' | 'projectId'>,
  sessionUserId: string,
  isAdmin: boolean,
): Promise<void> {
  if (view.projectId) {
    await assertCanManageProject(view.projectId, sessionUserId, isAdmin);
    return;
  }
  if (view.userId !== sessionUserId) {
    throw new Error('error.unauthorized');
  }
}
