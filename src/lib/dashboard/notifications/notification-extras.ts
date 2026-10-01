import type { LimitationType } from '@prisma/client';

export type NotificationInvestmentType = {
  id: string;
  limitationType: LimitationType;
  name: string | null;
};

export type NotificationExtras = {
  /** Rows still sitting in the project's current bank-import batch. */
  importBatchRowCount: number;
  investmentTypes: NotificationInvestmentType[];
};

export const EMPTY_NOTIFICATION_EXTRAS: NotificationExtras = {
  importBatchRowCount: 0,
  investmentTypes: [],
};
