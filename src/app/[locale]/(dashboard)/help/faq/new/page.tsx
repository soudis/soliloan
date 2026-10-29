import { getTranslations } from 'next-intl/server';
import { FaqArticleForm } from '@/components/help/faq/faq-article-form';
import { findFaqToc } from '@/lib/help/find-faq-toc';
import { requireAdmin } from '@/lib/require-session';
import { flattenFaqTocArticles } from '@/types/faq';

export default async function NewFaqArticlePage() {
  await requireAdmin();
  const toc = await findFaqToc(true);
  const t = await getTranslations('help.articleForm');

  return (
    <div className="space-y-6 pb-12">
      <h2 className="text-2xl font-semibold tracking-tight">{t('createTitle')}</h2>
      <FaqArticleForm categories={toc.categories} pickerArticles={flattenFaqTocArticles(toc)} />
    </div>
  );
}
