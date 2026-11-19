'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { invalidateDashboardWidgetResultsCache } from '@/lib/dashboard/widget-results-cache';
import { deleteImportUnsafe } from '@/lib/import/delete-import';
import { projectAction } from '@/lib/utils/safe-action';

/** Deletes everything an Import created (ADR 0011). */
export const deleteImportAction = projectAction
  .inputSchema(z.object({ projectId: z.string(), importId: z.string() }))
  .action(async ({ parsedInput: { projectId, importId }, ctx }) => {
    const userId = ctx.session.user.id;
    if (!userId) throw new Error('error.unauthorized');
    await deleteImportUnsafe(projectId, importId, { id: userId, name: ctx.session.user.name ?? '' });
    revalidatePath('/configuration');
    revalidatePath('/lenders/list');
    revalidatePath('/loans/list');
    invalidateDashboardWidgetResultsCache(projectId);
    return { deleted: true };
  });
