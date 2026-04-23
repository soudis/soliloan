'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { normalizeLoanInterestRate } from '@/lib/schemas/investment-type';
import { NumberParser } from '@/lib/utils';
import { projectAction } from '@/lib/utils/safe-action';

export const getLoansByInterestRateAction = projectAction
  .inputSchema(z.object({ projectId: z.string(), interestRate: z.string() }))
  .action(async ({ ctx, parsedInput }) => {
    const parser = new NumberParser('de-DE');
    const parsedRate = parser.parse(parsedInput.interestRate);

    if (parsedRate === null || Number.isNaN(parsedRate)) {
      return { loans: [] };
    }

    const normalizedRate = normalizeLoanInterestRate(parsedRate);

    const loans = await db.loan.findMany({
      where: {
        lender: { projectId: ctx.projectId },
        interestRate: normalizedRate,
      },
      select: {
        id: true,
        loanNumber: true,
        amount: true,
        interestRate: true,
        signDate: true,
        lender: {
          select: {
            firstName: true,
            lastName: true,
            organisationName: true,
            type: true,
          },
        },
      },
      orderBy: { loanNumber: 'asc' },
    });

    return { loans };
  });
