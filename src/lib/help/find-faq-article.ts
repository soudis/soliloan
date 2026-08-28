import { db } from '@/lib/db';
import type { FaqArticleRecord } from '@/types/faq';

export async function findFaqArticleBySlug(
  slug: string,
  includeUnpublished: boolean,
): Promise<FaqArticleRecord | null> {
  const article = await db.faqArticle.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      body: true,
      published: true,
      position: true,
      categoryId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!article) return null;
  if (!article.published && !includeUnpublished) return null;
  return article;
}

export async function nextFaqArticlePosition(categoryId: string): Promise<number> {
  const aggregate = await db.faqArticle.aggregate({
    where: { categoryId },
    _max: { position: true },
  });
  return (aggregate._max.position ?? -1) + 1;
}

export async function nextFaqCategoryPosition(): Promise<number> {
  const aggregate = await db.faqCategory.aggregate({
    _max: { position: true },
  });
  return (aggregate._max.position ?? -1) + 1;
}
