'use server';

import { getProjectLogoUnsafe } from '@/lib/templates/get-project-logo';
import { projectAction } from '@/lib/utils/safe-action';

export const getProjectLogoAction = projectAction.action(async ({ ctx }) => {
  return getProjectLogoUnsafe(ctx.projectId);
});
