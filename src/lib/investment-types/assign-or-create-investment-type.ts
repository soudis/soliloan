import { Entity, LimitationType, Operation, type PrismaClient } from '@prisma/client';
import { createAuditEntry, getInvestmentTypeContext, removeNullFields } from '@/lib/audit-trail';
import { normalizeLoanInterestRate } from '@/lib/schemas/investment-type';

export async function assignOrCreateInvestmentType(
  db: PrismaClient,
  { projectId, interestRate }: { projectId: string; interestRate: number },
): Promise<{ id: string; created: boolean }> {
  const normalizedRate = normalizeLoanInterestRate(interestRate);

  const existing = await db.investmentType.findUnique({
    where: {
      projectId_interestRate: {
        projectId,
        interestRate: normalizedRate,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return { id: existing.id, created: false };
  }

  const investmentType = await db.investmentType.create({
    data: {
      projectId,
      interestRate: normalizedRate,
      limitationType: LimitationType.TOTAL_AMOUNT_OVER_TIME_PERIOD,
      name: null,
    },
  });

  await createAuditEntry(db, {
    entity: Entity.investment_type,
    operation: Operation.CREATE,
    primaryKey: investmentType.id,
    before: {},
    after: removeNullFields(investmentType),
    context: getInvestmentTypeContext(investmentType),
    projectId,
  });

  return { id: investmentType.id, created: true };
}
