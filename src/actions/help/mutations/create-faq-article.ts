'use server';

import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { assertUniqueFaqArticleSlug, normalizeFaqSlug } from '@/lib/help/ensure-faq-slug';
import { extractFaqSearchText, sanitizeFaqBody } from '@/lib/help/faq-body';
import { nextFaqArticlePosition } from '@/lib/help/find-faq-article';
import { revalidateFaqPaths } from '@/lib/help/revalidate-faq';
import { faqArticleFormSchema } from '@/lib/schemas/faq';
import { adminAction } from '@/lib/utils/safe-action';
import { slugFieldError } from './slug-field-error';

export const createFaqArticleAction = adminAction
  .inputSchema(faqArticleFormSchema)
  .action(async ({ parsedInput, ctx }) => {
    const slug = normalizeFaqSlug(parsedInput.slug);
    try {
      await assertUniqueFaqArticleSlug(slug);
    } catch (error) {
      const fieldErrors = slugFieldError(error);
      if (fieldErrors) return fieldErrors;
      throw error;
    }

    const category = await db.faqCategory.findUnique({
      where: { id: parsedInput.categoryId },
      select: { id: true },
    });
    if (!category) {
      throw new Error('error.faq.categoryNotFound');
    }

    const body = sanitizeFaqBody(parsedInput.body);
    const article = await db.faqArticle.create({
      data: {
        title: parsedInput.title,
        slug,
        body: body as Prisma.InputJsonValue,
        searchText: extractFaqSearchText(body),
        published: parsedInput.published,
        position: await nextFaqArticlePosition(parsedInput.categoryId),
        createdBy: { connect: { id: ctx.session.user.id } },
        category: { connect: { id: parsedInput.categoryId } },
      },
      select: { id: true, slug: true },
    });

    revalidateFaqPaths();
    return { article };
  });
