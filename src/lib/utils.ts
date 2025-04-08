import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { SHA256 as sha256 } from "crypto-js";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hashPassword(password: string) {
  return sha256(password).toString();
}

export function verifyPassword(password: string, hashedPassword: string) {
  return hashPassword(password) === hashedPassword;
}