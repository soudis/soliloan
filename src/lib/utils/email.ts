/**
 * Normalizes an email for storage and unique lookups (trim + lowercase).
 */
export function normalizeStoredEmail(email: string): string {
  return email.trim().toLowerCase();
}
