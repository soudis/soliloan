import { z } from 'zod';

export const projectFormSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'validation.common.required' })
    .refine((val) => /[A-Za-z0-9]/.test(val), { message: 'validation.project.name.atLeastOneNonSpecialChar' }), // At least one non-special character to avoid problems with the slug
});

export type ProjectFormData = z.infer<typeof projectFormSchema>;
