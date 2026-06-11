'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { normalizeLoanInterestRate } from '@/lib/schemas/investment-type';
import { NumberParser } from '@/lib/utils';
import { projectAction } from '@/lib/utils/safe-action';

export async function getInvestmentTypeByInterestRateUnsafe(projectId: string, interestRate: string) {
  const parser = new NumberParser('de-DE');
  const parsedRate = parser.parse(interestRate);

  if (parsedRate === null || Number.isNaN(parsedRate)) {
    return { investmentType: null };
  }

  const normalizedRate = normalizeLoanInterestRate(parsedRate);

  const investmentType = await db.investmentType.findUnique({
    where: {
      projectId_interestRate: {
        projectId,
        interestRate: normalizedRate,
      },
    },
    include: {
      _count: { select: { loans: true } },
      loans: {
        select: {
          id: true,
          amount: true,
          signDate: true,
        },
      },
    },
  });

  return { investmentType };
}

export const getInvestmentTypeByInterestRateAction = projectAction
  .inputSchema(z.object({ projectId: z.string(), interestRate: z.string() }))
  .action(async ({ ctx, parsedInput }) => {
    return getInvestmentTypeByInterestRateUnsafe(ctx.projectId, parsedInput.interestRate);
  });
