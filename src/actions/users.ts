'use server';

import { db } from '@/lib/db';
import { sendPasswordInvitationEmail } from '@/lib/email';
import { lenderIdSchema } from '@/lib/schemas/common';
import { generateToken } from '@/lib/token';
import { lenderAction } from '@/lib/utils/safe-action';
import { revalidatePath } from 'next/cache';

/**
 * Send an invitation email to a user to set their password
 * Refactored to use lender context for valid authorization
 */
export const sendInvitationEmailAction = lenderAction
  .inputSchema(lenderIdSchema)
  .action(async ({ parsedInput: { lenderId } }) => {
    // Fetch lender with user and project details
    const lender = await db.lender.findUnique({
      where: { id: lenderId },
      include: {
        user: true,
        project: {
          select: { name: true },
        },
      },
    });

    if (!lender) {
      throw new Error('Lender not found');
    }

    if (!lender.user || !lender.email) {
      // Logic assumes user exists if we are inviting them to set password via this flow?
      // Or maybe we create user? The original code fetched user by ID.
      // LenderInfoCard checks if (lender.user).
      throw new Error('User not found for this lender');
    }

    const user = lender.user;

    // Generate a token for password reset
    const token = generateToken();

    // Calculate expiration date (7 days from now)
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 7 * 24);

    // Update the user with the token and expiration date
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetTokenExpiresAt: expirationDate,
        lastInvited: new Date(),
      },
    });

    // Send the invitation email
    await sendPasswordInvitationEmail(
      lender.email,
      user.name || lender.firstName || 'User',
      token,
      user.language || 'de',
      lender.project.name,
    );

    // Revalidate the lender page to update the lastInvited timestamp
    revalidatePath(`/lenders/${lenderId}`);

    return { success: true };
  });
