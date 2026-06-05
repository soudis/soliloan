'use server';

import { upsertGlobalDefaultLayout } from '@/lib/dashboard/layout-db';
import { upsertGlobalDashboardLayoutSchema } from '@/lib/schemas/dashboard-layout';
import { adminAction } from '@/lib/utils/safe-action';

export const upsertGlobalDashboardLayoutAction = adminAction
  .inputSchema(upsertGlobalDashboardLayoutSchema)
  .action(async ({ parsedInput }) => {
    await upsertGlobalDefaultLayout(parsedInput.layout);
    return { success: true };
  });
