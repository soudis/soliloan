'use client';

import type { useTranslations } from 'next-intl';

import { type InfoTextExternalLinks, richInfoText } from '@/lib/i18n/rich-info-text';

interface InfoTextProps {
  t: ReturnType<typeof useTranslations>;
  messageKey: string;
  values?: Record<string, unknown>;
  externalLinks?: InfoTextExternalLinks;
}

export function InfoText({ t, messageKey, values, externalLinks }: InfoTextProps) {
  return <span className="whitespace-pre-line">{richInfoText(t, messageKey, values, externalLinks)}</span>;
}
