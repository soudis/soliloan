import { getTranslations } from 'next-intl/server';

import { MigrationAssistant } from './migration-assistant';

export default async function MigrateProjectPage() {
  const t = await getTranslations('dashboard.migration');

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      <p className="text-muted-foreground mb-8">{t('description')}</p>
      <MigrationAssistant />
    </div>
  );
}
