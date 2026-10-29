'use server';

import { z } from 'zod';
import { getInvestmentTypesByProjectUnsafe } from '@/lib/investment-types/get-investment-types-by-project';
import { projectAction } from '@/lib/utils/safe-action';

export const getInvestmentTypesByProjectAction = projectAction
  .inputSchema(z.object({ projectId: z.string() }))
  .action(async ({ ctx }) => {
    return getInvestmentTypesByProjectUnsafe(ctx.projectId);
  });
