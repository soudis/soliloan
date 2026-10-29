import 'server-only';

import { getLoanStatus } from '@/lib/calculations/loan-calculations';
import { db } from '@/lib/db';
import type { LoanWithRelations } from '@/types/loans';

export async function getInvestmentTypesByProjectUnsafe(projectId: string) {
  const investmentTypes = await db.investmentType.findMany({
    where: { projectId },
    include: {
      loans: {
        select: {
          id: true,
          amount: true,
          signDate: true,
          terminationDate: true,
          terminationType: true,
          transactions: true,
        },
      },
      _count: { select: { loans: true } },
    },
    orderBy: { interestRate: 'asc' },
  });

  const today = new Date();

  return {
    investmentTypes: investmentTypes.map((investmentType) => ({
      ...investmentType,
      loans: investmentType.loans.map((loan) => ({
        id: loan.id,
        amount: loan.amount,
        signDate: loan.signDate,
        status: getLoanStatus(loan as LoanWithRelations, today),
      })),
    })),
  };
}
