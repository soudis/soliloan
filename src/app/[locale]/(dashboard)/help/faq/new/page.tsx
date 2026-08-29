import { getTranslations } from 'next-intl/server';

import { getFaqTocUnsafe } from '@/actions/help';
import { FaqArticleForm } from '@/components/help/faq/faq-article-form';
import { requireAdmin } from '@/lib/require-session';
import { flattenFaqTocArticles } from '@/types/faq';

export default async function NewFaqArticlePage() {
  await requireAdmin();
  const toc = await getFaqTocUnsafe(true);
  const t = await getTranslations('help.articleForm');

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">{t('createTitle')}</h2>
      <FaqArticleForm categories={toc.categories} pickerArticles={flattenFaqTocArticles(toc)} />
    </div>
  );
}
