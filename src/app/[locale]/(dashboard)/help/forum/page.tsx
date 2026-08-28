import { getTranslations } from 'next-intl/server';

import { requireManager } from '@/lib/require-session';

export default async function HelpForumPage() {
  await requireManager();
  const t = await getTranslations('help.forumPage');

  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="text-muted-foreground">{t('comingSoon')}</p>
    </div>
  );
}
