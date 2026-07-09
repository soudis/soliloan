import type { BankConnection } from '@prisma/client';

import { db } from '@/lib/db';

/** Returns the bank connections linked to a project (most recent first). */
export async function getBankConnections(projectId: string): Promise<BankConnection[]> {
  return db.bankConnection.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
}
