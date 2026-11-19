import 'server-only';

import { db } from '@/lib/db';

import type { StoredImportSettings } from './commit-import';
import type { ImportSummary } from './types';

export type ImportListEntry = {
  id: string;
  fileName: string;
  createdAt: Date;
  createdBy: string;
  deletedAt: Date | null;
  deletedBy: string | null;
  summary: ImportSummary;
};

/** The Imports of a project, newest first. The caller must have checked access to the project. */
export async function listImportsUnsafe(projectId: string): Promise<ImportListEntry[]> {
  const imports = await db.import.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fileName: true,
      createdAt: true,
      deletedAt: true,
      summary: true,
      createdBy: { select: { name: true } },
      deletedBy: { select: { name: true } },
    },
  });
  return imports.map((entry) => ({
    id: entry.id,
    fileName: entry.fileName,
    createdAt: entry.createdAt,
    createdBy: entry.createdBy.name,
    deletedAt: entry.deletedAt,
    deletedBy: entry.deletedBy?.name ?? null,
    summary: entry.summary as ImportSummary,
  }));
}

/** Settings of the project's latest Import, to start the next one with the same mapping. */
export async function getLastImportSettingsUnsafe(projectId: string): Promise<StoredImportSettings | null> {
  const latest = await db.import.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    select: { settings: true },
  });
  return (latest?.settings as StoredImportSettings | undefined) ?? null;
}
