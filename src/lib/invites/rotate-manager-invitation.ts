import { db } from '@/lib/db';
import { getInviteValidDays } from '@/lib/env';
import { generateToken } from '@/lib/token';

export async function rotateManagerInvitationTokens(userId: string): Promise<string> {
  const invitationToken = generateToken();
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + getInviteValidDays());

  await db.user.update({
    where: { id: userId },
    data: {
      inviteToken: invitationToken,
      inviteTokenExpiresAt: expirationDate,
      passwordResetToken: invitationToken,
      passwordResetTokenExpiresAt: expirationDate,
      lastInvited: new Date(),
    },
  });

  return invitationToken;
}
