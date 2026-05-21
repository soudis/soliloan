'use client';

import type { useTranslations } from 'next-intl';

import { richInfoText } from '@/lib/i18n/rich-info-text';

interface InfoTextProps {
  t: ReturnType<typeof useTranslations>;
  messageKey: string;
  values?: Record<string, unknown>;
}

export function InfoText({ t, messageKey, values }: InfoTextProps) {
  return <span className="whitespace-pre-line">{richInfoText(t, messageKey, values)}</span>;
}
