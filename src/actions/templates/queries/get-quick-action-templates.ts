'use server';

import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getQuickActionTemplatesSchema } from '@/lib/schemas/templates';
import { STARTER_TEMPLATE_SYSTEM_KEYS } from '@/lib/templates/starter-template-system-keys';
import { managerAction } from '@/lib/utils/safe-action';

const quickSelect = {
  id: true,
  name: true,
  description: true,
  type: true,
  dataset: true,
  isGlobal: true,
  isSystem: true,
  systemKey: true,
  projectId: true,
} as const satisfies Prisma.CommunicationTemplateSelect;

/**
 * Templates available in lender/loan/transaction quick actions (project + global; EMAIL + DOCUMENT).
 */
export const getQuickActionTemplatesAction = managerAction
  .inputSchema(getQuickActionTemplatesSchema)
  .action(async ({ parsedInput: { projectId, datasets }, ctx }) => {
    if (!ctx.session.user.isAdmin) {
      const project = await db.project.count({
        where: { id: projectId, managers: { some: { id: ctx.session.user.id } } },
      });
      if (project === 0) {
        throw new Error('error.project.notFound');
      }
    }

    const templates = await db.communicationTemplate.findMany({
      where: {
        OR: [{ projectId }, { isGlobal: true }],
        dataset: { in: datasets },
        type: { in: ['EMAIL', 'DOCUMENT'] },
        AND: [
          {
            OR: [
              { systemKey: null },
              { systemKey: { notIn: [...STARTER_TEMPLATE_SYSTEM_KEYS] } },
            ],
          },
        ],
      },
      select: quickSelect,
      orderBy: [{ isGlobal: 'desc' }, { name: 'asc' }],
    });

    return { templates };
  });
