import type { PrismaClient } from '@prisma/client';

type PrismaTransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export async function getNextLenderNumber(
  tx: PrismaClient | PrismaTransactionClient,
  projectId: string,
): Promise<string> {
  const lenders = await tx.lender.findMany({
    where: { projectId },
    select: { lenderNumber: true },
  });
  const maxNum = lenders.reduce((max, l) => {
    const n = Number.parseInt(l.lenderNumber, 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);
  return String(maxNum + 1);
}

export async function getNextLoanNumber(
  tx: PrismaClient | PrismaTransactionClient,
  projectId: string,
): Promise<string> {
  const loans = await tx.loan.findMany({
    where: { lender: { projectId } },
    select: { loanNumber: true },
  });
  const maxNum = loans.reduce((max, l) => {
    const n = Number.parseInt(l.loanNumber, 10);
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);
  return String(maxNum + 1);
}
