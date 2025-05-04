import { z } from "zod";

export const noteSchema = z.object({
  text: z.string().min(1, { message: "validation.common.required" }),
  public: z.boolean().default(false).nullish(),
});

export type NoteFormData = z.infer<typeof noteSchema>;
