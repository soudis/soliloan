'use server';

import { db } from '@/lib/db';
import { assertUniqueFaqCategorySlug, normalizeFaqSlug } from '@/lib/help/ensure-faq-slug';
import { nextFaqCategoryPosition } from '@/lib/help/find-faq-article';
import { revalidateFaqPaths } from '@/lib/help/revalidate-faq';
import { faqCategoryFormSchema } from '@/lib/schemas/faq';
import { adminAction } from '@/lib/utils/safe-action';
import { slugFieldError } from './slug-field-error';

export const createFaqCategoryAction = adminAction
  .inputSchema(faqCategoryFormSchema)
  .action(async ({ parsedInput }) => {
    const slug = normalizeFaqSlug(parsedInput.slug);
    try {
      await assertUniqueFaqCategorySlug(slug);
    } catch (error) {
      const fieldErrors = slugFieldError(error);
      if (fieldErrors) return fieldErrors;
      throw error;
    }

    const category = await db.faqCategory.create({
      data: {
        name: parsedInput.name,
        slug,
        position: await nextFaqCategoryPosition(),
      },
      select: { id: true, name: true, slug: true, position: true },
    });

    revalidateFaqPaths();
    return { category };
  });
