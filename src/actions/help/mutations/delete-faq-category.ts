'use server';

import { z } from 'zod';

import { db } from '@/lib/db';
import { revalidateFaqPaths } from '@/lib/help/revalidate-faq';
import { adminAction } from '@/lib/utils/safe-action';

export const deleteFaqCategoryAction = adminAction
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const existing = await db.faqCategory.findUnique({
      where: { id: parsedInput.id },
      select: { id: true, _count: { select: { articles: true } } },
    });
    if (!existing) {
      throw new Error('error.faq.categoryNotFound');
    }
    if (existing._count.articles > 0) {
      throw new Error('error.faq.categoryHasArticles');
    }

    await db.faqCategory.delete({ where: { id: existing.id } });
    revalidateFaqPaths();
    return { success: true };
  });
