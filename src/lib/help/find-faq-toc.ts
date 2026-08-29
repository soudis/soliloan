import { cache } from 'react';

import { db } from '@/lib/db';
import type { FaqToc, FaqTocArticle } from '@/types/faq';

const articleSelect = {
  id: true,
  title: true,
  slug: true,
  position: true,
  published: true,
  searchText: true,
  categoryId: true,
} satisfies Record<string, boolean>;

function toTocArticle(article: {
  id: string;
  title: string;
  slug: string;
  position: number;
  published: boolean;
  searchText: string;
  categoryId: string;
}): FaqTocArticle {
  return article;
}

export const findFaqToc = cache(async (includeUnpublished: boolean): Promise<FaqToc> => {
  const publishedFilter = includeUnpublished ? undefined : { published: true };

  const categories = await db.faqCategory.findMany({
    orderBy: { position: 'asc' },
    include: {
      articles: {
        where: publishedFilter,
        orderBy: { position: 'asc' },
        select: articleSelect,
      },
    },
  });

  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      position: category.position,
      articles: category.articles.map(toTocArticle),
    })),
  };
});
