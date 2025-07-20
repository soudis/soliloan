import { z } from 'zod';

export const fileSchema = z.object({
  name: z.string().min(1, { message: 'validation.common.required' }),
  description: z.string().nullable().optional(),
  public: z.boolean().default(false).nullish(),
  loanId: z.string().nullable().optional(),
});

export type FileFormData = z.infer<typeof fileSchema>;
