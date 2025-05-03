import { Transaction, TransactionType } from "@prisma/client";
import { type ClassValue, clsx } from "clsx";
import { SHA256 as sha256 } from "crypto-js";
import { twMerge } from "tailwind-merge";
import { calculateLoanFields } from "./calculations/loan-calculations";
import { LenderFormData } from "./schemas/lender";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hashPassword(password: string) {
  return sha256(password).toString();
}

export function verifyPassword(password: string, hashedPassword: string) {
  return hashPassword(password) === hashedPassword;
}

/**
 * Formats a number as a currency string using German locale and EUR currency
 * @param amount The amount to format
 * @returns A formatted currency string (e.g. "1.234,56 €")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

export const transactionSorter = (
  a: Transaction,
  b: Transaction
) => {
  if (a.date > b.date) return 1;
  else if (b.date > a.date) return -1;
  else if (a.type === TransactionType.TERMINATION) return 1;
  else if (b.type === TransactionType.TERMINATION) return -1;
  else if (a.type === TransactionType.DEPOSIT) return -1;
  else if (b.type === TransactionType.DEPOSIT) return 1;
  else return 0;
};

export const loansSorter = (
  a: ReturnType<typeof calculateLoanFields>,
  b: ReturnType<typeof calculateLoanFields>
) => {
  const score = a.signDate.getTime() - b.signDate.getTime();
  return score;
};

/**
 * Assembles a formatted name from a lender object
 * @param lender The lender object containing name fields
 * @returns A formatted name string
 */
export function getLenderName(lender: Pick<LenderFormData, 'type' | 'firstName' | 'lastName' | 'organisationName' | 'titlePrefix' | 'titleSuffix'>): string {
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
