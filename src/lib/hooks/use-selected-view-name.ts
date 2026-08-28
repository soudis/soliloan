'use client';

import type { View } from '@prisma/client';

/** Name of the table view selected via the list route param, if it exists in `views`. */
export function useSelectedViewName(views: View[], viewId?: string | null): string | undefined {
  return viewId ? views.find((v) => v.id === viewId)?.name : undefined;
}
