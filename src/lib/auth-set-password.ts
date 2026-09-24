import { db } from '@/lib/db';

type TokenUser = {
  passwordResetToken: string | null;
  passwordResetTokenExpiresAt: Date | null;
  inviteTokenExpiresAt: Date | null;
};

export function tokenExpiryForUser(user: TokenUser, token: string) {
  return user.passwordResetToken === token ? user.passwordResetTokenExpiresAt : user.inviteTokenExpiresAt;
}

export async function getSetPasswordTokenContext(token: string) {
  const user = await db.user.findFirst({
    where: {
      OR: [{ passwordResetToken: token }, { inviteToken: token }],
    },
    select: {
      name: true,
      email: true,
      passwordResetToken: true,
      passwordResetTokenExpiresAt: true,
      inviteTokenExpiresAt: true,
    },
  });

  if (!user) {
    return null;
  }

  const expiresAt = tokenExpiryForUser(user, token);
  if (!expiresAt || expiresAt < new Date()) {
    return null;
  }

  return {
    requireName: user.name.trim().length === 0,
    email: user.email,
  };
}
