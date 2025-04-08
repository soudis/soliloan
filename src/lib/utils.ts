import { type ClassValue, clsx } from "clsx";
import { SHA256 as sha256 } from "crypto-js";
import { twMerge } from "tailwind-merge";

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