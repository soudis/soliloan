'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import { generateToken } from '@/lib/token';
import { hashPassword } from '@/lib/utils/password';

/**
 * Set a user's password using a token
 * @param token The password reset token
 * @param password The new password
 * @returns Object with success status and message
 */
export async function setPassword(token: string, password: string) {
  try {
    // Find the user with the given reset token
    const user = await db.user.findFirst({
      where: {
        passwordResetToken: token,
      },
    });

    // Check if the user exists
    if (!user) {
      return { success: false, error: 'Invalid or expired token' };
    }

    // Check if the token has expired
    if (user.passwordResetTokenExpiresAt && user.passwordResetTokenExpiresAt < new Date()) {
      return { success: false, error: 'Token has expired' };
    }

    // Hash the new password
    const hashedPassword = hashPassword(password);

    // Update the user's password and clear the reset token
    await db.user.update({
      where: { id: user.id },
      data: {
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
    // Get the user from the database
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        language: true,
      },
    });

    if (!user) {
      return { success: true }; // Return success even if user not found for security
    }

    // Generate a token for password reset
    const token = generateToken();

    // Calculate expiration date (1 hour from now)
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 1);

    // Update the user with the token and expiration date
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetTokenExpiresAt: expirationDate,
      },
    });

    // Send the password reset email with the user's language preference
    await sendPasswordResetEmail(user.email!, user.name, token, user.language || 'de');

    return { success: true };
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return { success: false, error: 'Failed to request password reset' };
  }
}
