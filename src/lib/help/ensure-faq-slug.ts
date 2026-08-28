import { db } from '@/lib/db';
import { FAQ_RESERVED_SLUGS } from '@/lib/help/faq-constants';
import { slugify } from '@/lib/help/slugify';

export function normalizeFaqSlug(input: string): string {
  return slugify(input);
}

export async function assertUniqueFaqArticleSlug(slug: string, excludeId?: string): Promise<string> {
  if (!slug) {
    throw new Error('validation.common.required');
  }
  if (FAQ_RESERVED_SLUGS.has(slug)) {
    throw new Error('error.faq.slugReserved');
  }

  const existing = await db.faqArticle.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing && existing.id !== excludeId) {
    throw new Error('error.faq.slugTaken');
  }
  return slug;
}

export async function assertUniqueFaqCategorySlug(slug: string, excludeId?: string): Promise<string> {
  if (!slug) {
    throw new Error('validation.common.required');
  }

  const existing = await db.faqCategory.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing && existing.id !== excludeId) {
    throw new Error('error.faq.slugTaken');
  }
  return slug;
}
