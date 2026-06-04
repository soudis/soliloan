import { z } from 'zod';

import { isNoteContentEmpty, sanitizeNoteHtml } from '@/lib/notes/note-html';

export const noteSchema = z.object({
  text: z
    .string()
    .transform(sanitizeNoteHtml)
    .refine((value) => !isNoteContentEmpty(value), { message: 'validation.common.required' }),
  public: z.boolean().default(false).nullish(),
});

export type NoteFormData = z.infer<typeof noteSchema>;
