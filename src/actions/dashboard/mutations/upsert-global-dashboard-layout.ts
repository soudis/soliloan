'use server';

import { upsertGlobalDefaultLayout } from '@/lib/dashboard/layout-db';
import { clearDashboardWidgetResultsCache } from '@/lib/dashboard/widget-results-cache';
import { upsertGlobalDashboardLayoutSchema } from '@/lib/schemas/dashboard-layout';
import { adminAction } from '@/lib/utils/safe-action';

export const upsertGlobalDashboardLayoutAction = adminAction
  .inputSchema(upsertGlobalDashboardLayoutSchema)
  .action(async ({ parsedInput }) => {
    await upsertGlobalDefaultLayout(parsedInput.layout);
    clearDashboardWidgetResultsCache();
    return { success: true };
  });
