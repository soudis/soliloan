'use server';

import { findFaqArticleBySlug } from '@/lib/help/find-faq-article';

export async function getFaqArticleBySlugUnsafe(slug: string, includeUnpublished: boolean) {
  return findFaqArticleBySlug(slug, includeUnpublished);
}
