import { processTemplate } from '@/lib/templates/template-processor';

const FILENAME_BAD_CHARS = /[/\\?%*:|"<>]/g;
const WHITESPACE_COLLAPSE = /\s+/g;

function sanitizeFilenameBase(name: string): string {
  let s = name.replace(FILENAME_BAD_CHARS, '_').trim();
  if (s.length > 200) {
    s = s.slice(0, 200);
  }
  return s || 'document';
}

/**
 * Resolves merge tags in `subjectOrFilename`; for email subjects trims and collapses whitespace.
 * When `raw` is null/empty after trim, returns `fallback`.
 */
export function resolveTemplateSubject(
  raw: string | null | undefined,
  mergeData: Record<string, unknown>,
  fallback: string,
): string {
  const t = (raw ?? '').trim();
  if (!t) return fallback;
  const merged = processTemplate(t, mergeData).replace(WHITESPACE_COLLAPSE, ' ').trim();
  return merged || fallback;
}

/**
 * Resolves merge tags for a PDF download filename; sanitizes path characters and ensures `.pdf`.
 */
export function resolveTemplateFilename(
  raw: string | null | undefined,
  mergeData: Record<string, unknown>,
  fallback: string,
): string {
  const base =
    (raw ?? '').trim() !== ''
      ? sanitizeFilenameBase(processTemplate((raw ?? '').trim(), mergeData).replace(WHITESPACE_COLLAPSE, ' ').trim())
      : sanitizeFilenameBase(fallback);
  const withExt = base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
  return withExt;
}
