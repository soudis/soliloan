export const NOTIFICATION_KINDS = [
  'openInterest',
  'repayOverdue',
  'notDeposited',
  'savingsRateOpen',
  'repaySoon',
  'bankImport',
  'investmentTypeCapacity',
  'requiredFields',
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const DEFAULT_REPAY_SOON_DAYS = 30;
export const MIN_REPAY_SOON_DAYS = 1;
export const MAX_REPAY_SOON_DAYS = 365;

export type NotificationKindEnabled = Record<NotificationKind, boolean>;

export type NotificationsWidgetConfig = {
  enabled: NotificationKindEnabled;
  repaySoonDays: number;
};

export function createDefaultNotificationKindEnabled(): NotificationKindEnabled {
  return {
    openInterest: true,
    repayOverdue: true,
    notDeposited: true,
    savingsRateOpen: true,
    repaySoon: true,
    bankImport: true,
    investmentTypeCapacity: true,
    requiredFields: true,
  };
}

export function createDefaultNotificationsConfig(): NotificationsWidgetConfig {
  return {
    enabled: createDefaultNotificationKindEnabled(),
    repaySoonDays: DEFAULT_REPAY_SOON_DAYS,
  };
}

export function clampRepaySoonDays(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_REPAY_SOON_DAYS;
  }
  return Math.min(MAX_REPAY_SOON_DAYS, Math.max(MIN_REPAY_SOON_DAYS, Math.round(parsed)));
}

export function parseNotificationsConfig(config: unknown): NotificationsWidgetConfig {
  const defaults = createDefaultNotificationsConfig();
  if (!config || typeof config !== 'object') {
    return defaults;
  }

  const raw = config as { enabled?: unknown; repaySoonDays?: unknown };
  const enabled = { ...defaults.enabled };
  if (raw.enabled && typeof raw.enabled === 'object') {
    const rawEnabled = raw.enabled as Record<string, unknown>;
    for (const kind of NOTIFICATION_KINDS) {
      if (typeof rawEnabled[kind] === 'boolean') {
        enabled[kind] = rawEnabled[kind];
      }
    }
  }

  return {
    enabled,
    repaySoonDays: clampRepaySoonDays(raw.repaySoonDays),
  };
}
