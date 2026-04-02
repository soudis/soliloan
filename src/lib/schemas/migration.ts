import { z } from 'zod';

export const migrationFormSchema = z.object({
  baseUrl: z
    .string()
    .min(1, { message: 'validation.common.required' })
    .url({ message: 'validation.common.url' })
    .refine((val) => val.startsWith('https://'), {
      message: 'validation.migration.httpsRequired',
    }),
  accessToken: z.string().min(1, { message: 'validation.common.required' }),
});

export type MigrationFormData = z.infer<typeof migrationFormSchema>;
