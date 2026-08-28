import { notFound } from 'next/navigation';

import { getFaqArticleBySlugUnsafe, getFaqTocUnsafe } from '@/actions/help';
import { FaqArticleView } from '@/components/help/faq/faq-article-view';
import { requireManager } from '@/lib/require-session';
import { flattenFaqTocArticles } from '@/types/faq';

type FaqArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function FaqArticlePage({ params }: FaqArticlePageProps) {
  const { slug } = await params;
  const session = await requireManager();
  const isAdmin = Boolean(session.user.isAdmin);
  const [article, toc] = await Promise.all([getFaqArticleBySlugUnsafe(slug, isAdmin), getFaqTocUnsafe(isAdmin)]);

  if (!article) {
    notFound();
  }

  return (
    <FaqArticleView
      article={article}
      isAdmin={isAdmin}
      categories={toc.categories}
      pickerArticles={flattenFaqTocArticles(toc).filter((item) => item.slug !== article.slug)}
    />
  );
}
