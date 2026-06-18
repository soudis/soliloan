'use server';

import { resolveScopedLayout, upsertScopedLayout } from '@/lib/dashboard/layout-db';
import { cloneLayoutData } from '@/lib/dashboard/layout-utils';
import { copyDashboardLayoutSchema } from '@/lib/schemas/dashboard-layout';
import { authAction } from '@/lib/utils/safe-action';
import { assertCanManageProject } from '@/lib/views/access';

export const copyDashboardLayoutAction = authAction
  .inputSchema(copyDashboardLayoutSchema)
  .action(async ({ parsedInput, ctx }) => {
    const userId = ctx.session.user?.id;
    if (!userId) {
      throw new Error('error.unauthorized');
    }

    const isAdmin = ctx.session.user.isAdmin ?? false;
    const { projectId, sourceScope, targetScope } = parsedInput;

    if (sourceScope === 'project' || targetScope === 'project') {
      await assertCanManageProject(projectId, userId, isAdmin);
    }

    const sourceLayout =
      sourceScope === 'project'
        ? (await resolveScopedLayout('PROJECT', projectId)).layout
        : (await resolveScopedLayout('USER', userId)).layout;

    const cloned = cloneLayoutData(sourceLayout);

    if (targetScope === 'project') {
      await upsertScopedLayout('PROJECT', cloned, projectId);
    } else {
      await upsertScopedLayout('USER', cloned, userId);
    }

    return { layout: cloned };
  });
