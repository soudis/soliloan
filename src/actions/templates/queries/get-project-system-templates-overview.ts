'use server';

import { projectIdSchema } from '@/lib/schemas/common';
import { getProjectSystemTemplatesOverviewRows } from '@/lib/templates/project-system-templates-overview';
import { projectAction } from '@/lib/utils/safe-action';

export type { ProjectSystemTemplateOverviewRow } from '@/lib/templates/project-system-templates-overview';

export const getProjectSystemTemplatesOverviewAction = projectAction
  .inputSchema(projectIdSchema)
  .action(async ({ parsedInput: { projectId } }) => {
    const rows = await getProjectSystemTemplatesOverviewRows(projectId);
    return { rows };
  });
