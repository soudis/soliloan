'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { projectAction } from '@/lib/utils/safe-action';

export async function getInvestmentTypesByProjectUnsafe(projectId: string) {
  const investmentTypes = await db.investmentType.findMany({
    where: { projectId },
    include: { _count: { select: { loans: true } } },
    orderBy: { interestRate: 'asc' },
  });

  return { investmentTypes };
}

export const getInvestmentTypesByProjectAction = projectAction
  .inputSchema(z.object({ projectId: z.string() }))
  .action(async ({ ctx }) => {
    return getInvestmentTypesByProjectUnsafe(ctx.projectId);
  });
