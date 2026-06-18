export function formatDurationDays(
  days: number | null | undefined,
  t: (key: string, values?: Record<string, number>) => string,
): string {
  if (days === null || days === undefined || Number.isNaN(days) || days < 0) {
    return '–';
  }

  const wholeDays = Math.round(days);
  if (wholeDays === 0) {
    return t('zeroDays');
  }

  const years = Math.floor(wholeDays / 365);
  const afterYears = wholeDays % 365;
  const months = Math.floor(afterYears / 30);
  const remDays = afterYears % 30;

  const parts: string[] = [];
  if (years > 0) {
    parts.push(t('years', { count: years }));
  }
  if (months > 0) {
    parts.push(t('months', { count: months }));
  }
  if (remDays > 0 && years === 0) {
    parts.push(t('days', { count: remDays }));
  }

  if (parts.length === 0) {
    return t('days', { count: wholeDays });
  }

  return parts.join(' ');
}
