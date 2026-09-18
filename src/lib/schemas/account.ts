import { Language } from '@prisma/client';
import { z } from 'zod';

import { FORUM_DIGEST_DELAY_MINUTES } from '@/lib/help/forum-constants';

import { passwordSchema, selectEnumRequired } from './common';

export const userNameSchema = z.string().trim().min(2, { message: 'validation.account.nameRequired' });

export const updateProfileSchema = z.object({
  name: userNameSchema,
  language: selectEnumRequired(Language, 'validation.common.required'),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'validation.common.required' }),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, { message: 'validation.common.required' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'validation.account.passwordMismatch',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export const updateForumDigestDelayFormSchema = z.object({
  forumDigestDelayMinutes: z.enum(['15', '30', '60', '240', '720', '1440', '10080'], {
    message: 'validation.account.forumDigestDelayInvalid',
  }),
});

export type UpdateForumDigestDelayFormValues = z.infer<typeof updateForumDigestDelayFormSchema>;

export const updateForumDigestDelaySchema = z.object({
  forumDigestDelayMinutes: z.coerce
    .number()
    .refine(
      (value): value is (typeof FORUM_DIGEST_DELAY_MINUTES)[number] =>
        (FORUM_DIGEST_DELAY_MINUTES as readonly number[]).includes(value),
      { message: 'validation.account.forumDigestDelayInvalid' },
    ),
});

export type UpdateForumDigestDelayFormData = z.infer<typeof updateForumDigestDelaySchema>;
