const INVITE_VALID_DAYS_DEFAULT = 14;

/**
 * Gültigkeitsdauer einer Einladung in Tagen (aus .env, Fallback 14).
 */
export function getInviteValidDays(): number {
  const raw = process.env.INVITE_VALID_DAYS;
  if (raw == null || raw === '') return INVITE_VALID_DAYS_DEFAULT;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) || parsed < 1 ? INVITE_VALID_DAYS_DEFAULT : parsed;
}
