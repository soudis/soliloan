import { z } from 'zod'

export const fileSchema = z.object({
  name: z.string().min(1, { message: 'File name is required' }),
  description: z.string().nullable().optional(),
  public: z.boolean().default(false).nullish(),
})

export type FileFormData = z.infer<typeof fileSchema> 