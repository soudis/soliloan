export type FaqTocArticle = {
  id: string;
  title: string;
  slug: string;
  position: number;
  published: boolean;
  searchText: string;
  categoryId: string;
};

export type FaqTocCategory = {
  id: string;
  name: string;
  slug: string;
  position: number;
  articles: FaqTocArticle[];
};

export type FaqToc = {
  categories: FaqTocCategory[];
};

export type FaqArticleRecord = {
  id: string;
  title: string;
  slug: string;
  body: unknown;
  published: boolean;
  position: number;
  categoryId: string;
  createdAt: Date;
  updatedAt: Date;
};

export function flattenFaqTocArticles(toc: FaqToc): FaqTocArticle[] {
  return toc.categories.flatMap((category) => category.articles);
}
