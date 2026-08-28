import type { JSONContent } from '@tiptap/core';

export const FAQ_RESERVED_SLUGS = new Set(['new']);

export const EMPTY_FAQ_DOC: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export const FAQ_ARTICLE_PATH_PREFIX = '/help/faq/';

export const MEDIA_ID_IN_SRC_PATTERN = /\/api\/media\/([a-z][a-z0-9]{7,})(?=[/?#]|$)/i;
export const FAQ_ARTICLE_PATH_PATTERN = /^\/help\/faq\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function extractFaqMediaIdFromSrc(src: string): string | null {
  const match = src.trim().match(MEDIA_ID_IN_SRC_PATTERN);
  return match?.[1] ?? null;
}
