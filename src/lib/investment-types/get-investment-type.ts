import 'server-only';

import { getLoanStatus } from '@/lib/calculations/loan-calculations';
import { db } from '@/lib/db';
import type { LoanWithRelations } from '@/types/loans';

export async function getInvestmentTypeUnsafe(id: string) {
  const investmentType = await db.investmentType.findUnique({
    where: { id },
    include: {
      loans: {
        include: { lender: true, transactions: true },
        orderBy: { loanNumber: 'asc' },
      },
      _count: { select: { loans: true } },
    },
  });

  if (!investmentType) {
    return { investmentType };
  }

  const today = new Date();

  return {
    investmentType: {
      ...investmentType,
      loans: investmentType.loans.map((loan) => ({
        ...loan,
        status: getLoanStatus(loan as LoanWithRelations, today),
      })),
    },
  };
}
