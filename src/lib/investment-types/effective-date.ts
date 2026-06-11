import { format } from 'date-fns';

export function getDefaultEffectiveDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getEffectiveDateOrDefault(value: string | string[] | null | undefined): string {
  return typeof value === 'string' && value ? value : getDefaultEffectiveDate();
}
