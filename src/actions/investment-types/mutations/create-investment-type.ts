'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAuditEntry, getInvestmentTypeContext, removeNullFields } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { investmentTypeFormSchema, normalizeLoanInterestRate } from '@/lib/schemas/investment-type';
import { projectAction } from '@/lib/utils/safe-action';

export const createInvestmentTypeAction = projectAction
  .inputSchema(z.object({ projectId: z.string(), data: investmentTypeFormSchema }))
  .action(async ({ ctx, parsedInput }) => {
    const normalizedRate = normalizeLoanInterestRate(parsedInput.data.interestRate);

    const existing = await db.investmentType.findUnique({
      where: {
        projectId_interestRate: {
          projectId: ctx.projectId,
          interestRate: normalizedRate,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return { fieldErrors: { interestRate: 'error.investmentType.interestRateAlreadyExists' } };
    }

    const investmentType = await db.investmentType.create({
      data: {
        projectId: ctx.projectId,
        interestRate: normalizedRate,
        limitationType: parsedInput.data.limitationType,
        name: parsedInput.data.name || null,
      },
    });

    await createAuditEntry(db, {
      entity: Entity.investment_type,
      operation: Operation.CREATE,
      primaryKey: investmentType.id,
      before: {},
      after: removeNullFields(investmentType),
      context: getInvestmentTypeContext(investmentType),
      projectId: ctx.projectId,
    });

    revalidatePath('/investment-types');

    return { investmentType };
  });
