import { redirect } from 'next/navigation';

import { buildTableListHref } from '@/lib/table-list-path';

/** Redirect to the bare list when the view id is missing from `views`. */
export function resolveTableListViewId(
  viewId: string | undefined,
  views: { id: string }[],
  listPath: string,
  projectId: string,
): string | undefined {
  if (!viewId) return undefined;
  if (!views.some((view) => view.id === viewId)) {
    redirect(buildTableListHref(listPath, null, projectId));
  }
  return viewId;
}
