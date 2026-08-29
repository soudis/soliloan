'use server';

import type { JSONContent } from '@tiptap/core';
import { z } from 'zod';
import { db } from '@/lib/db';
import { deleteUnusedFaqMedia } from '@/lib/help/delete-unused-faq-media';
import { extractFaqMediaIds, sanitizeFaqBody } from '@/lib/help/faq-body';
import { revalidateFaqPaths } from '@/lib/help/revalidate-faq';
import { adminAction } from '@/lib/utils/safe-action';

export const deleteFaqArticleAction = adminAction
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const existing = await db.faqArticle.findUnique({
      where: { id: parsedInput.id },
      select: { id: true, body: true },
    });
    if (!existing) {
      throw new Error('error.faq.articleNotFound');
    }

    const mediaIds = extractFaqMediaIds(sanitizeFaqBody(existing.body as JSONContent));

    await db.faqArticle.delete({ where: { id: existing.id } });
    await deleteUnusedFaqMedia(mediaIds);

    revalidateFaqPaths();
    return { success: true };
  });
