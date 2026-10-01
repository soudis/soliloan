'use server';

import { z } from 'zod';
import { cloneLayoutData } from '@/lib/dashboard/layout-utils';
import { loadGlobalDashboardLayoutFile } from '@/lib/dashboard/load-global-dashboard-layout-file';
import { adminAction } from '@/lib/utils/safe-action';

export const loadGlobalDashboardLayoutSeedAction = adminAction.inputSchema(z.object({})).action(async () => {
  try {
    const layout = await loadGlobalDashboardLayoutFile();
    if (!layout) {
      throw new Error('error.dashboard.seedLayoutNotFound');
    }
    return { layout: cloneLayoutData(layout) };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('error.dashboard.')) {
      throw error;
    }
    throw new Error('error.dashboard.seedLayoutInvalid');
  }
});
