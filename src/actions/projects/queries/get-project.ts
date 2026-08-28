'use server';

import { getProjectUnsafe } from '@/lib/projects/get-project';
import { projectIdSchema } from '@/lib/schemas/common';
import { projectAction } from '@/lib/utils/safe-action';

export const getProjectAction = projectAction
  .inputSchema(projectIdSchema)
  .action(async ({ parsedInput: { projectId } }) => {
    return getProjectUnsafe(projectId);
  });
