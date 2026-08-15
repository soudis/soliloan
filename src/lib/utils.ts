import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import {
  addMonths,
  addYears,
  endOfMonth,
  endOfYear,
  format,
  isValid,
  parse,
  startOfMonth,
  startOfYear,
} from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { twMerge } from 'tailwind-merge';

export const DATE_INPUT_FORMAT = 'dd.MM.yyyy';

/** Shape used by getLenderName - avoids importing Prisma in client-bundled utils */
type LenderNameFields = {
  type?: 'PERSON' | 'ORGANISATION';
  firstName?: string | null;
  lastName?: string | null;
  organisationName?: string | null;
  titlePrefix?: string | null;
  titleSuffix?: string | null;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as a currency string using German locale and EUR currency
 * @param amount The amount to format
 * @returns A formatted currency string (e.g. "1.234,56 €")
 */
export function formatCurrency(amount: number | undefined | null, locale?: string): string {
  if (amount === undefined || amount === null) {
    return '';
  }
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Formats a number as a percentage string using German locale
 * @param amount The amount to format
 * @returns A formatted percentage string (e.g. "12,34 %")
 */
export function formatPercentage(amount: number | undefined | null, locale?: string): string {
  if (amount === undefined || amount === null) {
    return '';
  }
  const formattedValue = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  }).format(amount);
  return `${formattedValue} %`;
}

export function formatNumber(
  amount: number | undefined | null,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
  locale?: string,
): string {
  if (amount === undefined || amount === null) {
    return '';
  }
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'de-DE', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

export function resolveIntlLocaleForDates(locale: string): string {
  if (locale === 'de' || locale.startsWith('de-')) return 'de-DE';
  if (locale === 'en' || locale.startsWith('en-')) return 'en-US';
  return locale;
}

/** date-fns locale for react-day-picker; matches {@link resolveIntlLocaleForDates} branches. */
export function getDateFnsLocale(locale: string) {
  if (locale === 'de' || locale.startsWith('de-')) return de;
  return enUS;
}

/** Normalize a calendar date to UTC midnight (date-only, no local timezone shift). */
export function toUTCDate(date: Date | undefined | null): Date | null {
  if (!date) return null;
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
}

/** Format a date as ISO calendar day (yyyy-MM-dd) using UTC components (pairs with {@link toUTCDate}). */
export function formatIsoDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Template-friendly short date (e.g. 09.04.2026 in de-DE). */
export function formatDateShort(date: Date | string | null | undefined, locale: string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(resolveIntlLocaleForDates(locale), { dateStyle: 'short' }).format(d);
}

/** Template-friendly long date (e.g. 9. April 2026 in de-DE). */
export function formatDateLong(date: Date | string | null | undefined, locale: string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(resolveIntlLocaleForDates(locale), { dateStyle: 'long' }).format(d);
}

// Backwards compatible: existing code expects formatDate() to be the long form.
export const formatDate = formatDateLong;

/** Date picker keyboard input format (e.g. 09.04.2026). */
export function formatDateInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return format(d, DATE_INPUT_FORMAT);
}

const DATE_INPUT_PARSE_PATTERN = /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/;

/** Parse keyboard input; accepts D.M.YYYY / D.M.YY with optional leading zeros. */
export function parseDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = DATE_INPUT_PARSE_PATTERN.exec(trimmed);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const yearToken = match[3];
  const dateFormat = yearToken.length === 2 ? 'd.M.yy' : 'd.M.yyyy';
  const parsed = parse(trimmed, dateFormat, new Date());
  if (!isValid(parsed)) return null;
  if (parsed.getDate() !== day || parsed.getMonth() + 1 !== month) return null;
  if (yearToken.length === 4 && parsed.getFullYear() !== Number(yearToken)) return null;
  return parsed;
}

function resolvePresetBaseDate(baseDate?: Date | null): Date {
  return baseDate ?? new Date();
}

export function getMonthStartDate(baseDate?: Date | null): Date {
  return startOfMonth(resolvePresetBaseDate(baseDate));
}

export function getMonthEndDate(baseDate?: Date | null): Date {
  return endOfMonth(resolvePresetBaseDate(baseDate));
}

export function getNextMonthStartDate(baseDate?: Date | null): Date {
  return startOfMonth(addMonths(resolvePresetBaseDate(baseDate), 1));
}

export function getYearStartDate(baseDate?: Date | null): Date {
  return startOfYear(resolvePresetBaseDate(baseDate));
}

export function getYearEndDate(baseDate?: Date | null): Date {
  return endOfYear(resolvePresetBaseDate(baseDate));
}

export function getNextYearStartDate(baseDate?: Date | null): Date {
  return startOfYear(addYears(resolvePresetBaseDate(baseDate), 1));
}

export class NumberParser {
  private groupSymbol: string;
  private decimalSymbol: string;

  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: needed
  constructor(private readonly locale: string) {
    const parts = Intl.NumberFormat(locale).formatToParts(1111.11);
    this.groupSymbol = parts.find((part) => part.type === 'group')?.value ?? '.';
    this.decimalSymbol = parts.find((part) => part.type === 'decimal')?.value ?? ',';
  }

  parse(localizedNumber: string): number | null {
    if (!localizedNumber) {
      return null;
    }

    return typeof localizedNumber === 'string'
      ? Number(localizedNumber.replaceAll(this.groupSymbol, '').replaceAll(this.decimalSymbol, '.'))
      : localizedNumber;
  }

  strip(localizedNumber: string): string {
    const escapedGroupSymbol = this.groupSymbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedDecimalSymbol = this.decimalSymbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`[^0-9${escapedGroupSymbol}${escapedDecimalSymbol}]`, 'g');
    return localizedNumber.replace(regex, '');
  }
}

/**
 * Assembles a formatted name from a lender object
 * @param lender The lender object containing name fields
 * @returns A formatted name string
 */
export function getLenderName(lender: LenderNameFields): string {
  if (lender.type === 'ORGANISATION') {
    return lender.organisationName || '';
  }

  // For PERSON type
  const parts = [];

  if (lender.titlePrefix) parts.push(lender.titlePrefix);
  if (lender.firstName) parts.push(lender.firstName);
  if (lender.lastName) parts.push(lender.lastName);

  const name = parts.join(' ').trim();

  if (lender.titleSuffix) {
    return `${name}, ${lender.titleSuffix}`;
  }

  return name;
}

/**
 * Converts empty strings to null
 * @param value The value to check
 * @returns The value if not an empty string, otherwise null
 */
export function emptyStringToNull<T>(value: T): T | null {
  return value === '' ? null : value;
}
