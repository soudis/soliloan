import DOMPurify from 'isomorphic-dompurify';

const NOTE_ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a'];
const NOTE_A_ALLOWED_ATTRS = new Set(['href', 'target', 'rel', 'class']);

export function sanitizeNoteHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: NOTE_ALLOWED_TAGS,
    ALLOWED_ATTR: [],
    ADD_ATTR: (attr, tag) => tag === 'a' && NOTE_A_ALLOWED_ATTRS.has(attr),
    ALLOW_DATA_ATTR: false,
  });
}

export function isNoteHtml(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content.trim());
}

export function plainTextToNoteHtml(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const blocks = escaped.split(/\n\n+/);

  if (blocks.length <= 1) {
    const lines = escaped.split('\n');
    return `<p>${lines.join('<br>')}</p>`;
  }

  return blocks.map((block) => `<p>${block.split('\n').join('<br>')}</p>`).join('');
}

export function normalizeNoteContentForEditor(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return '<p></p>';
  if (isNoteHtml(trimmed)) return sanitizeNoteHtml(trimmed);
  return plainTextToNoteHtml(trimmed);
}

export function getNotePlainText(html: string): string {
  return sanitizeNoteHtml(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export function isNoteContentEmpty(html: string): boolean {
  return getNotePlainText(html).length === 0;
}
