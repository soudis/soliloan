'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { normalizeLoanInterestRate } from '@/lib/schemas/investment-type';
import { NumberParser } from '@/lib/utils';
import { projectAction } from '@/lib/utils/safe-action';

export const getInvestmentTypeByInterestRateAction = projectAction
  .inputSchema(z.object({ projectId: z.string(), interestRate: z.string() }))
  .action(async ({ ctx, parsedInput }) => {
    const parser = new NumberParser('de-DE');
    const parsedRate = parser.parse(parsedInput.interestRate);

    if (parsedRate === null || Number.isNaN(parsedRate)) {
      return { investmentType: null };
    }

    const normalizedRate = normalizeLoanInterestRate(parsedRate);

    const investmentType = await db.investmentType.findUnique({
      where: {
        projectId_interestRate: {
          projectId: ctx.projectId,
          interestRate: normalizedRate,
        },
      },
      include: { _count: { select: { loans: true } } },
    });

    return { investmentType };
  });
