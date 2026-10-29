'use server';

import { projectIdSchema } from '@/lib/schemas/common';
import { getTransactionsByProjectUnsafe } from '@/lib/transactions/get-transactions-by-project';
import { projectAction } from '@/lib/utils/safe-action';

export const getTransactionsByProjectAction = projectAction
  .inputSchema(projectIdSchema)
  .action(async ({ parsedInput }) => {
    return getTransactionsByProjectUnsafe(parsedInput.projectId);
  });
