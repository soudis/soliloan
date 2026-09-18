import type { Prisma, TemplateType } from '@prisma/client';

import { db } from '@/lib/db';

function starterSystemKeyForTemplateType(type: TemplateType): 'defaultEmail' | 'defaultDocument' {
  return type === 'EMAIL' ? 'defaultEmail' : 'defaultDocument';
}

export function isEmptyDesignJson(d: unknown): boolean {
  if (d == null || typeof d !== 'object') return true;
  return Object.keys(d as object).length === 0;
}

/**
 * Loads starter design/subject for a new template.
 * For EMAIL, prefers a project override of `defaultEmail` when `projectId` is set.
 */
export async function getDefaultStarterTemplateContent(
  type: TemplateType,
  projectId?: string | null,
): Promise<{
  designJson: Prisma.InputJsonValue;
  subjectOrFilename: string | null;
} | null> {
  const systemKey = starterSystemKeyForTemplateType(type);
  const scopedProjectId = type === 'EMAIL' ? projectId : undefined;
  const rows = await db.communicationTemplate.findMany({
    where: {
      systemKey,
      isSystem: true,
      ...(scopedProjectId ? { OR: [{ projectId: scopedProjectId }, { projectId: null }] } : { projectId: null }),
    },
    select: { designJson: true, subjectOrFilename: true, projectId: true },
  });
  if (rows.length === 0) return null;

  const projectRow = scopedProjectId ? rows.find((r) => r.projectId !== null) : undefined;
  const globalRow = rows.find((r) => r.projectId === null);
  const row = projectRow ?? globalRow ?? rows[0];
  if (!row) return null;

  return {
    designJson: (row.designJson ?? {}) as Prisma.InputJsonValue,
    subjectOrFilename: row.subjectOrFilename ?? null,
  };
}
