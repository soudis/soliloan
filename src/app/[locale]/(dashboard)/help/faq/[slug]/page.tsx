import { notFound } from 'next/navigation';
import { FaqArticleView } from '@/components/help/faq/faq-article-view';
import { findFaqArticleBySlug } from '@/lib/help/find-faq-article';
import { findFaqToc } from '@/lib/help/find-faq-toc';
import { requireManager } from '@/lib/require-session';
import { flattenFaqTocArticles } from '@/types/faq';

type FaqArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function FaqArticlePage({ params }: FaqArticlePageProps) {
  const { slug } = await params;
  const session = await requireManager();
  const isAdmin = Boolean(session.user.isAdmin);
  const [article, toc] = await Promise.all([findFaqArticleBySlug(slug, isAdmin), findFaqToc(isAdmin)]);

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
