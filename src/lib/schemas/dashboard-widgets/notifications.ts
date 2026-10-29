import { z } from 'zod';

import { MAX_REPAY_SOON_DAYS, MIN_REPAY_SOON_DAYS, NOTIFICATION_KINDS } from '@/types/dashboard-widgets/notifications';

const enabledSchema = z.object({
  openInterest: z.boolean(),
  repayOverdue: z.boolean(),
  notDeposited: z.boolean(),
  savingsRateOpen: z.boolean(),
  repaySoon: z.boolean(),
  bankImport: z.boolean(),
  investmentTypeCapacity: z.boolean(),
  requiredFields: z.boolean(),
});

export const notificationsWidgetConfigSchema = z.object({
  enabled: enabledSchema,
  repaySoonDays: z.number().int().min(MIN_REPAY_SOON_DAYS).max(MAX_REPAY_SOON_DAYS),
});

export const notificationKindSchema = z.enum(NOTIFICATION_KINDS);
