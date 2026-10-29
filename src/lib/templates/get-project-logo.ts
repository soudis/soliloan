import 'server-only';

import { db } from '@/lib/db';

/**
 * Fetch the logo for a project. Returns the base64 logo string from the
 * project configuration, or null if not found. Caller must enforce project access.
 */
export async function getProjectLogoUnsafe(projectId: string): Promise<string | null> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      configuration: {
        select: { logo: true },
      },
    },
  });

  return project?.configuration?.logo ?? null;
}
