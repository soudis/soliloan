'use client';

import type { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { InfoTextMore } from '@/components/ui/info-text-more';

export type InfoTextExternalLinks = string[];

const externalLinkClassName = 'text-primary underline underline-offset-2';

export const infoTextRichTags = {
  strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
  em: (chunks: ReactNode) => <em>{chunks}</em>,
  more: (chunks: ReactNode) => <InfoTextMore>{chunks}</InfoTextMore>,
};

export function richInfoText(
  t: ReturnType<typeof useTranslations>,
  key: string,
  values?: Record<string, unknown>,
  externalLinks?: InfoTextExternalLinks,
) {
  return t.rich(key, { ...values, ...infoTextRichTags, ...createExternalLinkTags(externalLinks) });
}

function createExternalLinkTags(externalLinks?: InfoTextExternalLinks) {
  return Object.fromEntries(
    externalLinks?.map((href, index) => [
      `link-${index + 1}`,
      (chunks: ReactNode) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className={externalLinkClassName}>
          {chunks}
        </a>
      ),
    ]) ?? [],
  );
}
