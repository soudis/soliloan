import { PROJECT_ID_KEY } from '@/lib/params';

const PROJECT_PATH_PREFIXES = [
  '/dashboard',
  '/lenders',
  '/loans',
  '/transactions',
  '/logbook',
  '/configuration',
  '/sandbox',
  '/investment-types',
] as const;

/** Routes under the project layout, which 404 when `projectId` is missing. */
export function isProjectScopedPath(href: string): boolean {
  const path = href.split(/[?#]/)[0] ?? href;
  return PROJECT_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

/** Appends `projectId` to an in-app href, keeping any query string already present. */
export function withProjectId(href: string, projectId?: string | null): string {
  if (!projectId) return href;

  const hashIndex = href.indexOf('#');
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const queryIndex = withoutHash.indexOf('?');
  const path = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const params = new URLSearchParams(queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '');

  if (!params.get(PROJECT_ID_KEY)) {
    params.set(PROJECT_ID_KEY, projectId);
  }

  const query = params.toString();
  return `${path}${query ? `?${query}` : ''}${hash}`;
}
