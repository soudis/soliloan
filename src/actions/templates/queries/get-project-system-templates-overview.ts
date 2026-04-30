'use server';

import type { TemplateDataset } from '@prisma/client';
import { db } from '@/lib/db';
import { projectIdSchema } from '@/lib/schemas/common';
import { STARTER_TEMPLATE_SYSTEM_KEYS } from '@/lib/templates/starter-template-system-keys';
import { projectAction } from '@/lib/utils/safe-action';

const starterKeys = [...STARTER_TEMPLATE_SYSTEM_KEYS];

export type ProjectSystemTemplateOverviewRow = {
  globalTemplateId: string;
  systemKey: string;
  effectiveTemplateId: string;
  isProjectClone: boolean;
  name: string;
  description: string | null;
  type: 'EMAIL' | 'DOCUMENT';
  dataset: TemplateDataset;
  /** DOCUMENT: lender portal visibility when true. */
  isPublic: boolean;
  /** ISO timestamp (serialized from server action payload). */
  createdAt: string;
};

export const getProjectSystemTemplatesOverviewAction = projectAction
  .inputSchema(projectIdSchema)
  .action(async ({ parsedInput: { projectId } }) => {
    const globals = await db.communicationTemplate.findMany({
      where: {
        isGlobal: true,
        isSystem: true,
        projectId: null,
        dataset: { not: 'USER' },
        systemKey: { not: null },
        NOT: {
          systemKey: { in: starterKeys },
        },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        dataset: true,
        systemKey: true,
        createdAt: true,
        isPublic: true,
      },
    });

    const overrides = await db.communicationTemplate.findMany({
      where: {
        projectId,
        isSystem: true,
        systemKey: { not: null },
      },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        dataset: true,
        systemKey: true,
        createdAt: true,
        isPublic: true,
      },
    });

    const overrideBySystemKey = new Map(
      overrides.flatMap((t) => (t.systemKey != null ? ([[t.systemKey, t]] as const) : [])),
    );

    const rows: ProjectSystemTemplateOverviewRow[] = globals
      .filter((g): g is typeof g & { systemKey: string } => g.systemKey != null)
      .map((g) => {
        const o = overrideBySystemKey.get(g.systemKey);
        const display = o ?? g;
        return {
          globalTemplateId: g.id,
          systemKey: g.systemKey,
          effectiveTemplateId: display.id,
          isProjectClone: Boolean(o),
          name: display.name,
          description: display.description,
          type: display.type as 'EMAIL' | 'DOCUMENT',
          dataset: display.dataset,
          isPublic: display.isPublic,
          createdAt: display.createdAt.toISOString(),
        };
      });

    return { rows };
  });
