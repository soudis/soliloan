'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import { passwordSchema } from '@/lib/schemas/common';
import { generateToken } from '@/lib/token';
import { normalizeStoredEmail } from '@/lib/utils/email';
import { hashPassword } from '@/lib/utils/password';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * Set a user's password using a token
 * @param token The password reset token
 * @param password The new password
 * @returns Object with success status and message
 */
export async function setPassword(token: string, password: string) {
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
    const expiresAt = user.passwordResetToken === token ? user.passwordResetTokenExpiresAt : user.inviteTokenExpiresAt;

    if (!expiresAt || expiresAt < new Date()) {
      return { success: false, error: 'Token has expired' };
    }

    // Hash the new password
    const hashedPassword = await hashPassword(password);

    // Update the user's password and clear the reset token
    await db.user.update({
      where: { id: user.id },
      data: {
        inviteToken: null,
        inviteTokenExpiresAt: null,
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    // Revalidate the auth pages
    revalidatePath('/auth/login');
    revalidatePath('/auth/set-password');

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

    const remainingMs = user.passwordResetTokenExpiresAt ? user.passwordResetTokenExpiresAt.getTime() - Date.now() : 0;
    if (remainingMs > PASSWORD_RESET_TTL_MS - PASSWORD_RESET_COOLDOWN_MS) {
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
    return { success: false, error: 'Failed to request password reset' };
  }
}
