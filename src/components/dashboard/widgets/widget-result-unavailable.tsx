'use client';

import { useTranslations } from 'next-intl';

export function WidgetResultUnavailable() {
  const t = useTranslations('dashboard.widgets');
  return <p className="text-sm text-muted-foreground">{t('resultUnavailable')}</p>;
}
