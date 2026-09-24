'use server';

import { tokenExpiryForUser } from '@/lib/auth-set-password';
import { db } from '@/lib/db';
import { EMAIL_SEND_FAILED, sendPasswordResetEmail } from '@/lib/email';
import { userNameSchema } from '@/lib/schemas/account';
import { passwordSchema } from '@/lib/schemas/common';
import { generateToken } from '@/lib/token';
import { normalizeStoredEmail } from '@/lib/utils/email';
import { hashPassword } from '@/lib/utils/password';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * Cooldown only applies to a live 1-hour password-reset token.
 * Manager/lender invites reuse `passwordResetTokenExpiresAt` with a multi-day TTL;
 * those must not suppress reset emails.
 */
function isPasswordResetInCooldown(passwordResetTokenExpiresAt: Date | null, now = Date.now()): boolean {
  if (!passwordResetTokenExpiresAt) return false;
  const remainingMs = passwordResetTokenExpiresAt.getTime() - now;
  if (remainingMs <= 0 || remainingMs > PASSWORD_RESET_TTL_MS) return false;
  return remainingMs > PASSWORD_RESET_TTL_MS - PASSWORD_RESET_COOLDOWN_MS;
}

/**
 * Set a user's password using a token
 * @param token The password reset token
 * @param password The new password
 * @param name Display name, required when the user has no name yet (new manager invite)
 * @returns Object with success status and message
 */
export async function setPassword(token: string, password: string, name?: string) {
  try {
    if (!passwordSchema.safeParse(password).success) {
      return { success: false, error: 'validation.account.passwordMinLength' };
    }

    // Find the user with the given reset token
    const user = await db.user.findFirst({
      where: {
        OR: [{ passwordResetToken: token }, { inviteToken: token }],
      },
    });

    // Check if the user exists
    if (!user) {
      return { success: false, error: 'Invalid or expired token' };
    }

    // A missing expiry counts as expired, so a token can never outlive its window.
    const expiresAt = tokenExpiryForUser(user, token);

    if (!expiresAt || expiresAt < new Date()) {
      return { success: false, error: 'Token has expired' };
    }

    const needsName = user.name.trim().length === 0;
    let nextName = user.name;
    if (needsName) {
      const parsedName = userNameSchema.safeParse(name);
      if (!parsedName.success) {
        return { success: false, error: 'validation.account.nameRequired' };
      }
      nextName = parsedName.data;
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update the user's password and clear the reset token
    await db.user.update({
      where: { id: user.id },
      data: {
        name: nextName,
        inviteToken: null,
        inviteTokenExpiresAt: null,
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error setting password:', error);
    return { success: false, error: 'Failed to set password' };
  }
}

/**
 * Request a password reset for a user
 * @param email The email address of the user
 * @returns Object with success status and message
 */
export async function requestPasswordReset(email: string) {
  try {
    const normalizedEmail = normalizeStoredEmail(email);
    // Get the user from the database
    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        language: true,
        passwordResetTokenExpiresAt: true,
      },
    });

    if (!user?.email) {
      return { success: true }; // Return success even if user not found for security
    }

    if (isPasswordResetInCooldown(user.passwordResetTokenExpiresAt)) {
      return { success: true };
    }

    // Generate a token for password reset
    const token = generateToken();
    const expirationDate = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    // Update the user with the token and expiration date
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetTokenExpiresAt: expirationDate,
      },
    });

    // Send the password reset email with the user's language preference
    await sendPasswordResetEmail(user.email, user.name, token, user.id, user.language || 'de');

    return { success: true };
  } catch (error) {
    console.error('Error requesting password reset:', error);
    if (error instanceof Error && error.message === EMAIL_SEND_FAILED) {
      return { success: false, error: EMAIL_SEND_FAILED };
    }
    return { success: false, error: 'Failed to request password reset' };
  }
}
