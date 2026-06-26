'use server';

import { Entity, Operation } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAuditEntry, getChangedFields, getInvestmentTypeContext } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { investmentTypeFormSchema, normalizeLoanInterestRate } from '@/lib/schemas/investment-type';
import { projectAction } from '@/lib/utils/safe-action';

export const updateInvestmentTypeAction = projectAction
  .inputSchema(z.object({ projectId: z.string(), investmentTypeId: z.string(), data: investmentTypeFormSchema }))
  .action(async ({ ctx, parsedInput }) => {
    const current = await db.investmentType.findUnique({
      where: { id: parsedInput.investmentTypeId },
      include: { _count: { select: { loans: true } } },
    });

    if (!current) {
      throw new Error('error.investmentType.notFound');
    }

    const normalizedRate = normalizeLoanInterestRate(parsedInput.data.interestRate);

    if (normalizedRate !== current.interestRate) {
      if (current._count.loans > 0) {
        return { fieldErrors: { interestRate: 'error.investmentType.cannotChangeInterestRateWithLoans' } };
      }

      const duplicate = await db.investmentType.findUnique({
        where: {
          projectId_interestRate: {
            projectId: ctx.projectId,
            interestRate: normalizedRate,
          },
        },
        select: { id: true },
      });

      if (duplicate && duplicate.id !== parsedInput.investmentTypeId) {
        return { fieldErrors: { interestRate: 'error.investmentType.interestRateAlreadyExists' } };
      }
    }

    const updated = await db.investmentType.update({
      where: { id: parsedInput.investmentTypeId },
      data: {
        interestRate: normalizedRate,
        limitationType: parsedInput.data.limitationType,
        name: parsedInput.data.name || null,
      },
    });

    const { before, after } = getChangedFields(current, updated);
    if (Object.keys(before).length > 0) {
      await createAuditEntry(db, {
        entity: Entity.investment_type,
        operation: Operation.UPDATE,
        primaryKey: updated.id,
        before,
        after,
        context: getInvestmentTypeContext(updated),
        projectId: ctx.projectId,
      });
    }

    revalidatePath('/investment-types');

    return { investmentType: updated };
  });
