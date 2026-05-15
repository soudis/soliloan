'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { assertCanModifyView } from '@/lib/views/access';

export async function getViewById(viewId: string) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    const view = await db.view.findUnique({
      where: { id: viewId },
    });

    if (!view) {
      throw new Error('View not found');
    }

    const userId = session.user?.id;
    if (!userId) {
      throw new Error('Unauthorized');
    }
    await assertCanModifyView(view, userId, session.user.isAdmin ?? false);

    return { view };
  } catch (error) {
    console.error('Error fetching view:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to fetch view',
    };
  }
}
