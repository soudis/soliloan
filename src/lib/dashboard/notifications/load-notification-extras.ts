import { db } from '@/lib/db';

import type { NotificationExtras } from './notification-extras';

export async function loadNotificationExtras(projectId: string): Promise<NotificationExtras> {
  const [batch, investmentTypes] = await Promise.all([
    db.bankImportBatch.findUnique({
      where: { projectId },
      select: { _count: { select: { rows: true } } },
    }),
    db.investmentType.findMany({
      where: { projectId },
      select: { id: true, limitationType: true, name: true },
      orderBy: { interestRate: 'asc' },
    }),
  ]);

  return {
    importBatchRowCount: batch?._count.rows ?? 0,
    investmentTypes,
  };
}
