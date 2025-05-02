'use server'

import { db } from '@/lib/db';
import { sendPasswordInvitationEmail } from '@/lib/email';
import { generateToken } from '@/lib/token';
import { revalidatePath } from 'next/cache';

/**
 * Send an invitation email to a user to set their password
 * @param userId The ID of the user to send the invitation to
 * @returns Object with success status and message
 */
export async function sendInvitationEmail(userId: string, projectName: string) {
  try {
    // Get the user from the database
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        lastInvited: true,
        language: true,
      },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.email) {
      return { success: false, error: 'User has no email address' };
    }

    // Generate a token for password reset
    const token = generateToken();

    // Calculate expiration date (7 days from now)
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 7 * 24);

    // Update the user with the token and expiration date
    await db.user.update({
      where: { id: user.id },
      data: {
        // @ts-ignore - passwordResetToken exists in the schema but not in types
        passwordResetToken: token,
        // @ts-ignore - passwordResetTokenExpiresAt exists in the schema but not in types
        passwordResetTokenExpiresAt: expirationDate,
        lastInvited: new Date()
      },
    });

    // Send the invitation email with the user's language preference
    await sendPasswordInvitationEmail(
      user.email,
      user.name || 'User',
      token,
      user.language || 'de',
      projectName
    );

    // Revalidate the lender page to update the lastInvited timestamp
    revalidatePath('/dashboard/lenders/[lenderId]');

    return { success: true };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return { success: false, error: 'Failed to send invitation email' };
  }
} 