'use server';

import { deleteScopedLayout, getGlobalDefaultLayout } from '@/lib/dashboard/layout-db';
import { cloneLayoutData } from '@/lib/dashboard/layout-utils';
import {
  invalidateDashboardWidgetResultsCache,
  invalidateDashboardWidgetResultsCacheForUser,
} from '@/lib/dashboard/widget-results-cache';
import { resetProjectDashboardLayoutSchema, resetUserDashboardLayoutSchema } from '@/lib/schemas/dashboard-layout';
import { authAction, projectAction } from '@/lib/utils/safe-action';

export const resetProjectDashboardLayoutAction = projectAction
  .inputSchema(resetProjectDashboardLayoutSchema)
  .action(async ({ parsedInput }) => {
    await deleteScopedLayout('PROJECT', parsedInput.projectId);
    invalidateDashboardWidgetResultsCache(parsedInput.projectId);
    const layout = await getGlobalDefaultLayout();
    return { layout: cloneLayoutData(layout) };
  });

export const resetUserDashboardLayoutAction = authAction
  .inputSchema(resetUserDashboardLayoutSchema)
  .action(async ({ ctx }) => {
    const userId = ctx.session.user?.id;
    if (!userId) {
      throw new Error('error.unauthorized');
    }

    await deleteScopedLayout('USER', userId);
    invalidateDashboardWidgetResultsCacheForUser(userId);
    const layout = await getGlobalDefaultLayout();
    return { layout: cloneLayoutData(layout) };
  });
