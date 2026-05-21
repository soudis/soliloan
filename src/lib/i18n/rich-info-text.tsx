'use client';

import type { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { InfoTextMore } from '@/components/ui/info-text-more';

export const infoTextRichTags = {
  strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
  em: (chunks: ReactNode) => <em>{chunks}</em>,
  more: (chunks: ReactNode) => <InfoTextMore>{chunks}</InfoTextMore>,
};

export function richInfoText(
  t: ReturnType<typeof useTranslations>,
  key: string,
  values?: Record<string, unknown>,
) {
  return t.rich(key, { ...values, ...infoTextRichTags });
}
