'use server';

import { db } from '@/lib/db';

/**
 * Fetch the logo for a project. Returns the base64 logo string from the
 * project configuration, or null if not found.
 */
export async function getProjectLogoAction(projectId: string): Promise<string | null> {
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
