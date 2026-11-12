import path from 'node:path';

export const PUBLIC_DIR = path.join(process.cwd(), 'public');

/**
 * PDF images are rendered on the server, so the server must never fetch them
 * over HTTP: behind a TLS-terminating proxy the request origin points at the
 * app's own plain-HTTP port (#205). Inline data URLs pass through and same-app
 * relative paths resolve to files under `public/`. Anything else is dropped.
 */
export function resolvePdfImageSrc(src: string, publicDir: string = PUBLIC_DIR): string {
  if (!src) return src;
  if (src.startsWith('data:')) return src;
  if (!src.startsWith('/')) return '';

  const filePath = path.resolve(publicDir, `.${src.split(/[?#]/)[0]}`);
  return filePath.startsWith(publicDir + path.sep) ? filePath : '';
}
