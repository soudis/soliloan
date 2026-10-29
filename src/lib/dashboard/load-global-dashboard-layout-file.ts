import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { dashboardLayoutDataSaveSchema } from '@/lib/schemas/dashboard-layout';
import type { DashboardLayoutData } from '@/types/dashboard-layout';

/** Same file `prisma/seed.ts` and `scripts/export-global-dashboard-layout.ts` use. */
export const GLOBAL_DASHBOARD_LAYOUT_FILE = path.join(process.cwd(), 'prisma', 'global-dashboard-layout.json');

/**
 * Reads `prisma/global-dashboard-layout.json`.
 * Format from `scripts/export-global-dashboard-layout.ts`: `{ layout }`.
 * Returns null when the file is missing. Throws `error.dashboard.seedLayoutInvalid` when the JSON is not a valid layout.
 */
export async function loadGlobalDashboardLayoutFile(): Promise<DashboardLayoutData | null> {
  let fileContent: string;
  try {
    fileContent = await readFile(GLOBAL_DASHBOARD_LAYOUT_FILE, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContent);
  } catch {
    throw new Error('error.dashboard.seedLayoutInvalid');
  }

  const layout =
    parsed && typeof parsed === 'object' && parsed !== null && 'layout' in parsed
      ? (parsed as { layout?: unknown }).layout
      : parsed;

  const result = dashboardLayoutDataSaveSchema.safeParse(layout);
  if (!result.success) {
    throw new Error('error.dashboard.seedLayoutInvalid');
  }

  return result.data as DashboardLayoutData;
}
