import { SHA256 } from "crypto-js";

export function hashPassword(password: string) {
  return SHA256(password).toString();
}

export function verifyPassword(password: string, hashedPassword: string) {
  return hashPassword(password) === hashedPassword;
}
