import { Language } from '@prisma/client';
import { z } from 'zod';

import { selectEnumRequired } from './common';

export const updateProfileSchema = z.object({
  name: z.string().min(2, { message: 'validation.account.nameRequired' }),
  language: selectEnumRequired(Language, 'validation.common.required'),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'validation.common.required' }),
    newPassword: z.string().min(8, { message: 'validation.account.passwordMinLength' }),
    confirmPassword: z.string().min(1, { message: 'validation.common.required' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'validation.account.passwordMismatch',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
