'use client';

import type { View } from '@prisma/client';
import { parseAsString, useQueryState } from 'nuqs';

/** Name of the table view selected via the `view` URL param, if it exists in `views`. */
export function useSelectedViewName(views: View[]): string | undefined {
  const [viewId] = useQueryState('view', parseAsString);
  return viewId ? views.find((v) => v.id === viewId)?.name : undefined;
}
