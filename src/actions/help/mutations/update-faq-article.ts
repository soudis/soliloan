'use server';

import type { Prisma } from '@prisma/client';
import type { JSONContent } from '@tiptap/core';
import { z } from 'zod';
import { db } from '@/lib/db';
import { deleteUnusedFaqMedia } from '@/lib/help/delete-unused-faq-media';
import { assertUniqueFaqArticleSlug, normalizeFaqSlug } from '@/lib/help/ensure-faq-slug';
import { extractFaqMediaIds, extractFaqSearchText, sanitizeFaqBody } from '@/lib/help/faq-body';
import { nextFaqArticlePosition } from '@/lib/help/find-faq-article';
import { revalidateFaqPaths } from '@/lib/help/revalidate-faq';
import { faqArticleFormSchema } from '@/lib/schemas/faq';
import { adminAction } from '@/lib/utils/safe-action';
import { slugFieldError } from './slug-field-error';

export const updateFaqArticleAction = adminAction
  .inputSchema(
    faqArticleFormSchema.extend({
      id: z.string().min(1),
    }),
  )
  .action(async ({ parsedInput }) => {
    const existing = await db.faqArticle.findUnique({
      where: { id: parsedInput.id },
      select: { id: true, body: true, categoryId: true },
    });
    if (!existing) {
      throw new Error('error.faq.articleNotFound');
    }

    const slug = normalizeFaqSlug(parsedInput.slug);
    try {
      await assertUniqueFaqArticleSlug(slug, existing.id);
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
    const previousMediaIds = extractFaqMediaIds(sanitizeFaqBody(existing.body as JSONContent));
    const nextMediaIds = new Set(extractFaqMediaIds(body));
    const removedMediaIds = previousMediaIds.filter((id) => !nextMediaIds.has(id));
    const categoryChanged = existing.categoryId !== parsedInput.categoryId;
    const position = categoryChanged ? await nextFaqArticlePosition(parsedInput.categoryId) : undefined;

    await db.faqArticle.update({
      where: { id: existing.id },
      data: {
        title: parsedInput.title,
        slug,
        body: body as Prisma.InputJsonValue,
        searchText: extractFaqSearchText(body),
        published: parsedInput.published,
        ...(position !== undefined ? { position } : {}),
        category: { connect: { id: parsedInput.categoryId } },
      },
    });

    if (removedMediaIds.length > 0) {
      await deleteUnusedFaqMedia(removedMediaIds);
    }

    revalidateFaqPaths();
    return { article: { id: existing.id, slug } };
  });
