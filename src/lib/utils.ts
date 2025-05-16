import { Lender, Transaction, TransactionType } from '@prisma/client';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as a currency string using German locale and EUR currency
 * @param amount The amount to format
 * @returns A formatted currency string (e.g. "1.234,56 €")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Formats a number as a percentage string using German locale
 * @param amount The amount to format
 * @returns A formatted percentage string (e.g. "12.34%")
 */
export function formatPercentage(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(amount);
}

export function formatNumber(
  amount: number | undefined | null,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
): string {
  if (amount === undefined || amount === null) {
    return '';
  }
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

export class NumberParser {
  private groupSymbol: string;
  private decimalSymbol: string;

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

export const transactionSorter = (a: Transaction, b: Transaction) => {
  if (a.date > b.date) return 1;
  else if (b.date > a.date) return -1;
  else if (a.type === TransactionType.TERMINATION) return 1;
  else if (b.type === TransactionType.TERMINATION) return -1;
  else if (a.type === TransactionType.DEPOSIT) return -1;
  else if (b.type === TransactionType.DEPOSIT) return 1;
  else return 0;
};

export const loansSorter = <T extends { signDate: Date }>(a: T, b: T) => {
  const score = b.signDate.getTime() - a.signDate.getTime();
  return score;
};

/**
 * Assembles a formatted name from a lender object
 * @param lender The lender object containing name fields
 * @returns A formatted name string
 */
export function getLenderName(
  lender: Partial<Pick<Lender, 'type' | 'firstName' | 'lastName' | 'organisationName' | 'titlePrefix' | 'titleSuffix'>>,
): string {
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
