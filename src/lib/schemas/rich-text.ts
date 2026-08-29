import { z } from 'zod';

import { EMPTY_FAQ_DOC } from '@/lib/help/faq-constants';

/** React Flight strips `attrs` from `{ type: 'link' }` host-element lookalikes. Send JSON text instead. */
export function serializeRichTextBody(body: unknown): string {
  return JSON.stringify(body ?? EMPTY_FAQ_DOC);
}

export const richTextBodyActionSchema = z.string().transform((value, ctx) => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    ctx.addIssue({ code: 'custom', message: 'validation.common.required' });
    return z.NEVER;
  }
});
