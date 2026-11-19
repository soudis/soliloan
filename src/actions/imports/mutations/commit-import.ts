'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { invalidateDashboardWidgetResultsCache } from '@/lib/dashboard/widget-results-cache';
import { commitImportUnsafe } from '@/lib/import/commit-import';
import { importFileInputSchema, importSettingsSchema } from '@/lib/schemas/import';
import { projectAction } from '@/lib/utils/safe-action';

/** Imports the file: validates it again on the server and creates everything in one transaction, or nothing. */
export const commitImportAction = projectAction
  .inputSchema(importFileInputSchema.extend({ settings: importSettingsSchema, acknowledgeWarnings: z.boolean() }))
  .action(async ({ parsedInput: { projectId, fileName, base64Data, settings, acknowledgeWarnings }, ctx }) => {
    const userId = ctx.session.user.id;
    if (!userId) throw new Error('error.unauthorized');
    const result = await commitImportUnsafe({
      projectId,
      user: { id: userId, name: ctx.session.user.name ?? '' },
      fileName,
      bytes: new Uint8Array(Buffer.from(base64Data, 'base64')),
      settings,
      acknowledgeWarnings,
    });
    if (result.ok) {
      revalidatePath('/configuration');
      revalidatePath('/lenders/list');
      revalidatePath('/loans/list');
      invalidateDashboardWidgetResultsCache(projectId);
    }
    return result;
  });
