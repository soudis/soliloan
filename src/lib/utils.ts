import { Transaction, TransactionType } from "@prisma/client";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { LenderFormData } from "./schemas/lender";

import type { ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as a currency string using German locale and EUR currency
 * @param amount The amount to format
 * @returns A formatted currency string (e.g. "1.234,56 €")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
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
  const score = a.signDate.getTime() - b.signDate.getTime();
  return score;
};

/**
 * Assembles a formatted name from a lender object
 * @param lender The lender object containing name fields
 * @returns A formatted name string
 */
export function getLenderName(
  lender: Pick<
    LenderFormData,
    | "type"
    | "firstName"
    | "lastName"
    | "organisationName"
    | "titlePrefix"
    | "titleSuffix"
  >
): string {
  if (lender.type === "ORGANISATION") {
    return lender.organisationName || "";
  }

  // For PERSON type
  const parts = [];

  if (lender.titlePrefix) parts.push(lender.titlePrefix);
  if (lender.firstName) parts.push(lender.firstName);
  if (lender.lastName) parts.push(lender.lastName);

  const name = parts.join(" ").trim();

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
  return value === "" ? null : value;
}
