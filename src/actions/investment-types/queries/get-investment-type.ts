'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { projectAction } from '@/lib/utils/safe-action';

export async function getInvestmentTypeUnsafe(id: string) {
  const investmentType = await db.investmentType.findUnique({
    where: { id },
    include: {
      loans: {
        include: { lender: true },
        orderBy: { loanNumber: 'asc' },
      },
      _count: { select: { loans: true } },
    },
  });

  return { investmentType };
}

export const getInvestmentTypeAction = projectAction
  .inputSchema(z.object({ projectId: z.string(), investmentTypeId: z.string() }))
  .action(async ({ parsedInput }) => {
    return getInvestmentTypeUnsafe(parsedInput.investmentTypeId);
  });
