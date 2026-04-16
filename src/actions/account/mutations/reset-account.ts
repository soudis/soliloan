'use server';

import { Language, SoliLoansTheme } from '@prisma/client';

import { db } from '@/lib/db';
import { authAction } from '@/lib/utils/safe-action';

export const resetAccountAction = authAction.action(async ({ ctx: { session } }) => {
  const userId = session.user.id;

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        emailVerified: null,
        password: null,
        inviteToken: null,
        image: null,
        isAdmin: null,
        lastLogin: null,
        lastInvited: null,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
        language: Language.de,
        theme: SoliLoansTheme.default,
        managerOf: { set: [] },
      },
    }),
    db.view.deleteMany({ where: { userId } }),
    db.account.deleteMany({ where: { userId } }),
  ]);

  return { success: true };
});
