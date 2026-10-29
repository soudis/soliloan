'use server';

import { z } from 'zod';
import { getInvestmentTypeByInterestRateUnsafe } from '@/lib/investment-types/get-investment-type-by-interest-rate';
import { projectAction } from '@/lib/utils/safe-action';

export const getInvestmentTypeByInterestRateAction = projectAction
  .inputSchema(z.object({ projectId: z.string(), interestRate: z.string() }))
  .action(async ({ ctx, parsedInput }) => {
    return getInvestmentTypeByInterestRateUnsafe(ctx.projectId, parsedInput.interestRate);
  });
