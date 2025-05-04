import crypto from "crypto";

/**
 * Generate a secure random token for password reset
 * @param length The length of the token (default: 32)
 * @returns A secure random token
 */
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString("hex");
}
