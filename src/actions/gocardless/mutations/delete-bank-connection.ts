'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { deleteRequisition } from '@/lib/gocardless/client';
import { deleteBankConnectionSchema } from '@/lib/schemas/gocardless';
import { projectAction } from '@/lib/utils/safe-action';

export const deleteBankConnectionAction = projectAction
  .inputSchema(deleteBankConnectionSchema)
  .action(async ({ parsedInput: { projectId, connectionId } }) => {
    const connection = await db.bankConnection.findUnique({
      where: { id: connectionId },
      select: { id: true, projectId: true, requisitionId: true },
    });

    if (!connection || connection.projectId !== projectId) {
      throw new Error('error.gocardless.connectionNotFound');
    }

    // Best-effort revoke on the GoCardless side; ignore if already gone.
    try {
      await deleteRequisition(connection.requisitionId);
    } catch (error) {
      console.error('Failed to delete GoCardless requisition', error);
    }

    await db.bankConnection.delete({ where: { id: connection.id } });

    revalidatePath('/configuration');

    return { success: true };
  });
