'use server';

import { db } from '@/lib/db';
import { changePasswordSchema } from '@/lib/schemas/account';
import { hashPassword, verifyPassword } from '@/lib/utils/password';
import { authAction } from '@/lib/utils/safe-action';

export const changePasswordAction = authAction
  .inputSchema(changePasswordSchema)
  .action(async ({ parsedInput: { currentPassword, newPassword }, ctx: { session } }) => {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user?.password) {
      throw new Error('error.account.noPassword');
    }

    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      throw new Error('error.password.invalidCurrent');
    }

    const hashedPassword = await hashPassword(newPassword);

    await db.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    return { success: true };
  });
