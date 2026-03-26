'use server';

import crypto from 'node:crypto';
import { Entity, Operation } from '@prisma/client';
import { omit } from 'lodash';
import moment from 'moment';
import { z } from 'zod';
import { createAuditEntry, getManagerContext } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { parseAdditionalFieldConfig } from '@/lib/utils/additional-fields';
import { hashPassword } from '@/lib/utils/password';
import { projectAction } from '@/lib/utils/safe-action';

async function getProjectWithConfiguration(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      managers: true,
      configuration: {
        include: { loanTemplates: true },
      },
      lenders: {
        include: { loans: { include: { transactions: true } } },
      },
    },
  });
  if (!project) return null;
  return {
    ...omit(project, ['lenders']),
    hasHistoricTransactions: project.lenders.some((lender) =>
      lender.loans.some(
        (loan) => loan.transactions.filter((t) => moment(t.date).isBefore(moment().startOf('year'))).length > 0,
      ),
    ),
    configuration: {
      ...project.configuration,
      lenderAdditionalFields: parseAdditionalFieldConfig(project.configuration.lenderAdditionalFields) ?? [],
      loanAdditionalFields: parseAdditionalFieldConfig(project.configuration.loanAdditionalFields) ?? [],
    },
  };
}

export const addProjectManagerAction = projectAction
  .inputSchema(
    z.object({
      projectId: z.string(),
      email: z.email(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const { projectId, email } = parsedInput;

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { managers: true, configuration: true },
    });

    if (!project) throw new Error('error.project.notFound');

    let user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      const password = 'test12345xy';
      const passwordHashed = await hashPassword(password);
      const invitationToken = generateInviteToken();

      if (!project.configuration) throw new Error('error.configuration.notFound');
      const configuration = project.configuration;

      user = await db.user.create({
        data: {
          email: email.trim().toLowerCase(),
          name: '',
          emailVerified: null,
          password: passwordHashed,
          inviteToken: invitationToken,
          lastInvited: new Date(),
          language: configuration.userLanguage ?? undefined,
          theme: configuration.userTheme ?? undefined,
        },
      });
    }

    const alreadyManager = project.managers.some((m) => m.id === user.id);
    if (alreadyManager) {
      throw new Error('error.configuration.managerAlreadyAdded');
    }

    await db.project.update({
      where: { id: projectId },
      data: {
        managers: {
          connect: { id: user.id },
        },
      },
    });

    const before = project.managers.map((m) => ({ id: m.id, email: m.email }));
    const after = [...project.managers, user].map((m) => ({ id: m.id, email: m.email }));
    await createAuditEntry(db, {
      entity: Entity.project,
      operation: Operation.UPDATE,
      primaryKey: projectId,
      before: { managers: before },
      after: { managers: after },
      context: {
        ...getManagerContext(user),
        managerAction: 'added',
      },
      projectId,
    });

    const updated = await getProjectWithConfiguration(projectId);
    return { project: updated };
  });

function generateInviteToken(byteLength = 32): string {
  const bytes = crypto.randomBytes(byteLength);
  return bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
