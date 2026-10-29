'use server';

import { z } from 'zod';
import { getInvestmentTypeUnsafe } from '@/lib/investment-types/get-investment-type';
import { projectAction } from '@/lib/utils/safe-action';

export const getInvestmentTypeAction = projectAction
  .inputSchema(z.object({ projectId: z.string(), investmentTypeId: z.string() }))
  .action(async ({ parsedInput }) => {
    return getInvestmentTypeUnsafe(parsedInput.investmentTypeId);
  });
