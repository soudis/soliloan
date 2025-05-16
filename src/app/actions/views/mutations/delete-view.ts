'use server';

import { revalidatePath } from 'next/cache';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function deleteView(viewId: string) {
  try {
    const session = await auth();
    if (!session) {
      throw new Error('Unauthorized');
    }

    // Fetch the view
    const view = await db.view.findUnique({
      where: {
        id: viewId,
      },
    });

    if (!view) {
      throw new Error('View not found');
    }

    // Check if the user has access to the view
    if (view.userId !== session.user.id) {
      throw new Error('You do not have access to this view');
    }

    // Delete the view
    await db.view.delete({
      where: {
        id: viewId,
      },
    });

    // Revalidate the view
    revalidatePath(`/${view.type.toLowerCase()}`);

    return { success: true };
  } catch (error) {
    console.error('Error deleting view:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to delete view',
    };
  }
}
