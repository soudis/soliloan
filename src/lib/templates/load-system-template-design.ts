import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Prisma } from '@prisma/client';

export const SYSTEM_TEMPLATE_DESIGNS_DIR = path.join(process.cwd(), 'prisma', 'system-template-designs');

const SYSTEM_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

export type LoadedSystemTemplateFile = {
  designJson: Prisma.InputJsonValue;
  subjectOrFilename: string | null;
};

function normalizeSubjectOrFilename(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
}

/**
 * Loads `prisma/system-template-designs/<systemKey>.json`.
 * Format from `scripts/export-email-templates.ts`: `{ designJson, subjectOrFilename }`.
 * Legacy files are raw design JSON only (no wrapper) — `subjectOrFilename` is then null.
 * Returns `null` when the file does not exist.
 */
export async function loadSystemTemplateDesignFile(systemKey: string): Promise<LoadedSystemTemplateFile | null> {
  if (!SYSTEM_KEY_PATTERN.test(systemKey)) {
    return null;
  }

  const designsDir = path.resolve(SYSTEM_TEMPLATE_DESIGNS_DIR);
  const filePath = path.resolve(designsDir, `${systemKey}.json`);
  if (!filePath.startsWith(`${designsDir}${path.sep}`)) {
    return null;
  }

  try {
    const fileContent = await readFile(filePath, 'utf8');
    const parsed: unknown = JSON.parse(fileContent);
    if (parsed && typeof parsed === 'object' && parsed !== null && 'designJson' in parsed) {
      const o = parsed as { designJson?: unknown; subjectOrFilename?: unknown };
      return {
        designJson: (o.designJson ?? {}) as Prisma.InputJsonValue,
        subjectOrFilename: normalizeSubjectOrFilename(o.subjectOrFilename),
      };
    }
    return {
      designJson: parsed as Prisma.InputJsonValue,
      subjectOrFilename: null,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}
