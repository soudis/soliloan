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
 * Loads the global system row (`defaultEmail` / `defaultDocument`) for initial template content.
 */
export async function getDefaultStarterTemplateContent(type: TemplateType): Promise<{
  designJson: Prisma.InputJsonValue;
  subjectOrFilename: string | null;
} | null> {
  const systemKey = starterSystemKeyForTemplateType(type);
  const row = await db.communicationTemplate.findFirst({
    where: { systemKey, isGlobal: true, projectId: null, isSystem: true },
    select: { designJson: true, subjectOrFilename: true },
  });
  if (!row) return null;
  return {
    designJson: (row.designJson ?? {}) as Prisma.InputJsonValue,
    subjectOrFilename: row.subjectOrFilename ?? null,
  };
}
