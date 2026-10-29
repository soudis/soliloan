'use server';

import { getLendersByProjectIdUnsafe } from '@/lib/lenders/get-lenders-by-project';
import { projectIdSchema } from '@/lib/schemas/common';
import { projectAction } from '@/lib/utils/safe-action';

export const getLendersByProjectAction = projectAction
  .inputSchema(projectIdSchema)
  .action(async ({ parsedInput: { projectId } }) => {
    return getLendersByProjectIdUnsafe(projectId);
  });
