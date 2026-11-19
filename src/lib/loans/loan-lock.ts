import 'server-only';

import type { Prisma } from '@prisma/client';

/**
 * Locks the Kredit's row until the surrounding DB transaction ends. Every write of a Zahlung checks
 * the ledger and writes inside one transaction that first takes this lock, so two parallel saves on
 * the same Kredit run one after the other and each checks the ledger the other one left. Read the
 * Zahlungen after this call.
 */
export const lockLoan = async (tx: Prisma.TransactionClient, loanId: string) => {
  await tx.$queryRaw`SELECT id FROM "Loan" WHERE id = ${loanId} FOR UPDATE`;
};
