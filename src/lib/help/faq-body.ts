import type { JSONContent } from '@tiptap/core';

import { EMPTY_FAQ_DOC, extractFaqMediaIdFromSrc, FAQ_ARTICLE_PATH_PATTERN } from '@/lib/help/faq-constants';
import { mediaUrl } from '@/lib/media';

const ALLOWED_NODES = new Set([
  'doc',
  'paragraph',
  'heading',
  'text',
  'hardBreak',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'codeBlock',
  'table',
  'tableRow',
  'tableCell',
  'tableHeader',
  'image',
]);

const ALLOWED_MARKS = new Set(['bold', 'italic', 'underline', 'code', 'link']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeHref(href: unknown): string | null {
  if (typeof href !== 'string') return null;
  const trimmed = href.trim();
  if (FAQ_ARTICLE_PATH_PATTERN.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (
      url.protocol === 'http:' ||
      url.protocol === 'https:' ||
      url.protocol === 'mailto:' ||
      url.protocol === 'tel:'
    ) {
      return trimmed;
    }
  } catch {
    return null;
  }
  return null;
}

function sanitizeMarks(marks: unknown): JSONContent['marks'] {
  if (!Array.isArray(marks)) return undefined;
  const next = marks.flatMap((mark) => {
    if (!isRecord(mark) || typeof mark.type !== 'string' || !ALLOWED_MARKS.has(mark.type)) {
      return [];
    }
    if (mark.type !== 'link') {
      return [{ type: mark.type }];
    }
    const href = sanitizeHref(isRecord(mark.attrs) ? mark.attrs.href : undefined);
    if (!href) return [];
    return [
      {
        type: 'link',
        attrs: {
          href,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      },
    ];
  });
  return next.length > 0 ? next : undefined;
}

function sanitizeNode(node: unknown): JSONContent | null {
  if (!isRecord(node) || typeof node.type !== 'string' || !ALLOWED_NODES.has(node.type)) {
    return null;
  }

  if (node.type === 'text') {
    if (typeof node.text !== 'string' || node.text.length === 0) return null;
    const marks = sanitizeMarks(node.marks);
    return marks ? { type: 'text', text: node.text, marks } : { type: 'text', text: node.text };
  }

  if (node.type === 'hardBreak') {
    return { type: 'hardBreak' };
  }

  if (node.type === 'image') {
    const attrs = isRecord(node.attrs) ? node.attrs : {};
    if (typeof attrs.src !== 'string') return null;
    const mediaId = extractFaqMediaIdFromSrc(attrs.src);
    if (!mediaId) return null;
    return {
      type: 'image',
      attrs: {
        src: mediaUrl(mediaId),
        alt: typeof attrs.alt === 'string' ? attrs.alt.slice(0, 200) : '',
        ...(typeof attrs.title === 'string' ? { title: attrs.title.slice(0, 200) } : {}),
        ...(typeof attrs.width === 'number' ? { width: attrs.width } : {}),
        ...(typeof attrs.height === 'number' ? { height: attrs.height } : {}),
      },
    };
  }

  const attrs: Record<string, unknown> = {};
  if (node.type === 'heading') {
    const level = isRecord(node.attrs) ? node.attrs.level : undefined;
    attrs.level = level === 3 ? 3 : 2;
  }

  const content = Array.isArray(node.content)
    ? node.content.map(sanitizeNode).filter((child): child is JSONContent => child !== null)
    : undefined;

  return {
    type: node.type,
    ...(Object.keys(attrs).length > 0 ? { attrs } : {}),
    ...(content && content.length > 0 ? { content } : {}),
  };
}

export function sanitizeFaqBody(input: unknown): JSONContent {
  const sanitized = sanitizeNode(input);
  if (sanitized?.type !== 'doc') {
    return EMPTY_FAQ_DOC;
  }
  if (!sanitized.content || sanitized.content.length === 0) {
    return EMPTY_FAQ_DOC;
  }
  return sanitized;
}

export function extractFaqSearchText(doc: JSONContent): string {
  const parts: string[] = [];

  const walk = (node: JSONContent) => {
    if (node.type === 'text' && node.text) {
      parts.push(node.text);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
    }
  };

  walk(doc);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function extractFaqMediaIds(doc: JSONContent): string[] {
  const ids = new Set<string>();

  const walk = (node: JSONContent) => {
    if (node.type === 'image' && node.attrs && typeof node.attrs.src === 'string') {
      const mediaId = extractFaqMediaIdFromSrc(node.attrs.src);
      if (mediaId) ids.add(mediaId);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
    }
  };

  walk(doc);
  return [...ids];
}

export function rewriteFaqMediaSrcs(doc: JSONContent): JSONContent {
  const walk = (node: JSONContent): JSONContent => {
    let next: JSONContent = node;
    if (node.type === 'image' && node.attrs && typeof node.attrs.src === 'string') {
      const mediaId = extractFaqMediaIdFromSrc(node.attrs.src);
      if (mediaId) {
        next = { ...node, attrs: { ...node.attrs, src: mediaUrl(mediaId) } };
      }
    }
    if (!Array.isArray(next.content)) return next;
    return { ...next, content: next.content.map(walk) };
  };

  return walk(doc);
}
