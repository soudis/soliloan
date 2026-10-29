import 'server-only';

import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

export const globalTemplateListSelect = {
  id: true,
  name: true,
  description: true,
  subjectOrFilename: true,
  type: true,
  dataset: true,
  isGlobal: true,
  isSystem: true,
  systemKey: true,
  projectId: true,
  createdAt: true,
  updatedAt: true,
  isPublic: true,
  project: {
    select: {
      id: true,
      configuration: { select: { name: true } },
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
    },
  },
} as const satisfies Prisma.CommunicationTemplateSelect;

/** Global templates for admin UI (server components). Caller must enforce admin. */
export async function getGlobalTemplatesUnsafe() {
  return db.communicationTemplate.findMany({
    where: { isGlobal: true },
    select: globalTemplateListSelect,
    orderBy: [{ isGlobal: 'desc' }, { name: 'asc' }],
  });
}
