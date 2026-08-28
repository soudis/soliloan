'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { assertUniqueFaqCategorySlug, normalizeFaqSlug } from '@/lib/help/ensure-faq-slug';
import { revalidateFaqPaths } from '@/lib/help/revalidate-faq';
import { faqCategoryFormSchema } from '@/lib/schemas/faq';
import { adminAction } from '@/lib/utils/safe-action';
import { slugFieldError } from './slug-field-error';

export const updateFaqCategoryAction = adminAction
  .inputSchema(
    faqCategoryFormSchema.extend({
      id: z.string().min(1),
    }),
  )
  .action(async ({ parsedInput }) => {
    const existing = await db.faqCategory.findUnique({
      where: { id: parsedInput.id },
      select: { id: true },
    });
    if (!existing) {
      throw new Error('error.faq.categoryNotFound');
    }

    const slug = normalizeFaqSlug(parsedInput.slug);
    try {
      await assertUniqueFaqCategorySlug(slug, existing.id);
    } catch (error) {
      const fieldErrors = slugFieldError(error);
      if (fieldErrors) return fieldErrors;
      throw error;
    }

    const category = await db.faqCategory.update({
      where: { id: existing.id },
      data: {
        name: parsedInput.name,
        slug,
      },
      select: { id: true, name: true, slug: true, position: true },
    });

    revalidateFaqPaths();
    return { category };
  });
