import { withProjectId } from '@/lib/project-href';

export const TABLE_LIST_PATHS = {
  lenders: '/lenders/list',
  loans: '/loans/list',
  transactions: '/transactions/list',
  investmentTypes: '/investment-types/list',
} as const;

export function buildTableListHref(listPath: string, viewId?: string | null, projectId?: string | null): string {
  const path = viewId ? `${listPath}/${viewId}` : listPath;
  return withProjectId(path, projectId);
}

/** next-intl `usePathname` (no locale prefix). */
export function pathnameIsTableList(pathname: string, listPath: string): boolean {
  return pathname === listPath || pathname.startsWith(`${listPath}/`);
}
