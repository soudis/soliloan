/**
 * Rewrites template image sources for email, where the mail client loads them.
 * Only inline data URLs and same-app relative paths are allowed so a design
 * cannot point at arbitrary addresses. PDFs use `resolvePdfImageSrc` instead.
 */
export function resolveTemplateImageSrc(src: string, assetBaseUrl?: string): string {
  if (!src) return src;
  if (src.startsWith('data:')) return src;

  if (src.startsWith('/')) {
    const baseUrl = (assetBaseUrl || process.env.SOLILOAN_URL || process.env.NEXTAUTH_URL || '').replace(/\/+$/, '');
    return baseUrl ? `${baseUrl}${src}` : src;
  }

  return '';
}
