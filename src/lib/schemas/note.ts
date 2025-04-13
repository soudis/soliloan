import { z } from 'zod'

export const noteSchema = z.object({
  text: z.string().min(1, { message: 'Note text is required' }),
  public: z.boolean().default(false).nullish(),
})

export type NoteFormData = z.infer<typeof noteSchema> 