import { Country, type PrismaClient } from '@prisma/client';

export function germanLoansWhere(projectId: string) {
  return {
    lender: {
      projectId,
      country: Country.DE,
    },
  } as const;
}

export async function countGermanLoans(db: PrismaClient, projectId: string): Promise<number> {
  return db.loan.count({
    where: germanLoansWhere(projectId),
  });
}
