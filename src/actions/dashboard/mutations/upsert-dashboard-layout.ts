'use server';

import { upsertScopedLayout } from '@/lib/dashboard/layout-db';
import {
  invalidateDashboardWidgetResultsCache,
  invalidateDashboardWidgetResultsCacheForUser,
} from '@/lib/dashboard/widget-results-cache';
import { upsertProjectDashboardLayoutSchema, upsertUserDashboardLayoutSchema } from '@/lib/schemas/dashboard-layout';
import { authAction, projectAction } from '@/lib/utils/safe-action';

export const upsertProjectDashboardLayoutAction = projectAction
  .inputSchema(upsertProjectDashboardLayoutSchema)
  .action(async ({ parsedInput }) => {
    await upsertScopedLayout('PROJECT', parsedInput.layout, parsedInput.projectId);
    invalidateDashboardWidgetResultsCache(parsedInput.projectId);
    return { success: true };
  });

export const upsertUserDashboardLayoutAction = authAction
  .inputSchema(upsertUserDashboardLayoutSchema)
  .action(async ({ parsedInput, ctx }) => {
    const userId = ctx.session.user?.id;
    if (!userId) {
      throw new Error('error.unauthorized');
    }
    await upsertScopedLayout('USER', parsedInput.layout, userId);
    invalidateDashboardWidgetResultsCacheForUser(userId);
    return { success: true };
  });
