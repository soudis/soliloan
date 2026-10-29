'use server';

import { getLoansByProjectUnsafe } from '@/lib/loans/get-loans-by-project';
import { projectIdSchema } from '@/lib/schemas/common';
import { projectAction } from '@/lib/utils/safe-action';

export const getLoansByProjectAction = projectAction.inputSchema(projectIdSchema).action(async ({ parsedInput }) => {
  return getLoansByProjectUnsafe(parsedInput.projectId);
});
