'use server';

import { z } from 'zod';

import { getImportDeletionPreviewUnsafe } from '@/lib/import/delete-import';
import { projectAction } from '@/lib/utils/safe-action';

/** What deleting an Import would remove, for the confirmation dialog. */
export const getImportDeletionPreviewAction = projectAction
  .inputSchema(z.object({ projectId: z.string(), importId: z.string() }))
  .action(async ({ parsedInput: { projectId, importId } }) => getImportDeletionPreviewUnsafe(projectId, importId));
