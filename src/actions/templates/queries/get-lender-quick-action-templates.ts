'use server';

import type { Prisma } from '@prisma/client';

import { db } from '@/lib/db';
import { getLenderQuickActionTemplatesSchema } from '@/lib/schemas/templates';
import { STARTER_TEMPLATE_SYSTEM_KEYS } from '@/lib/templates/starter-template-system-keys';
import { authAction } from '@/lib/utils/safe-action';

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
  isPublic: true,
} as const satisfies Prisma.CommunicationTemplateSelect;

/** Public DOCUMENT templates (loan + yearly) for lender loan card quick actions */
export const getLenderQuickActionTemplatesAction = authAction
  .inputSchema(getLenderQuickActionTemplatesSchema)
  .action(async ({ parsedInput: { projectId, loanId }, ctx }) => {
    const email = ctx.session.user.email;
    if (!email) {
      throw new Error('error.unauthorized');
    }

    const loan = await db.loan.findUnique({
      where: { id: loanId },
      select: {
        lender: {
          select: { id: true, email: true, projectId: true },
        },
      },
    });

    if (!loan || loan.lender.projectId !== projectId || loan.lender.email !== email) {
      throw new Error('error.loan.notFound');
    }

    const templates = await db.communicationTemplate.findMany({
      where: {
        OR: [{ projectId }, { isGlobal: true }],
        dataset: { in: ['LOAN', 'LENDER_YEARLY'] },
        type: 'DOCUMENT',
        isPublic: true,
        AND: [
          {
            OR: [{ systemKey: null }, { systemKey: { notIn: [...STARTER_TEMPLATE_SYSTEM_KEYS] } }],
          },
        ],
      },
      select: quickSelect,
      orderBy: [{ isGlobal: 'desc' }, { name: 'asc' }],
    });

    return {
      // filter out system templates that have a project clone
      templates: templates.filter((tpl) =>
        templates.some((t) => t.systemKey === tpl.systemKey && tpl.id !== t.id && !t.projectId),
      ),
    };
  });
