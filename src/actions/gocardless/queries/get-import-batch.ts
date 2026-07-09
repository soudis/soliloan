import { db } from '@/lib/db';

/** Returns the single linked bank connection for a project, if any. */
export async function getLinkedBankConnection(projectId: string) {
  return db.bankConnection.findFirst({
    where: { projectId, status: 'LN' },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getImportBatch(projectId: string) {
  return db.bankImportBatch.findUnique({
    where: { projectId },
    include: {
      rows: {
        orderBy: { bookingDate: 'desc' },
      },
    },
  });
}
