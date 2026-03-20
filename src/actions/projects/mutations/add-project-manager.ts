'use server';

import { Entity, Operation } from '@prisma/client';
import { omit } from 'lodash';
import moment from 'moment';
import { z } from 'zod';
import { createAuditEntry, getManagerContext } from '@/lib/audit-trail';
import { db } from '@/lib/db';
import { sendProjectManagerInvitationEmail, type ProjectManagerInviteContext } from '@/lib/email';
import { generateToken } from '@/lib/token';
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
    const normalizedEmail = email.trim().toLowerCase();

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { managers: true, configuration: true },
    });

    if (!project) throw new Error('error.project.notFound');

    let user = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    const existingUserId = user?.id;
    const alreadyManager = existingUserId ? project.managers.some((m) => m.id === existingUserId) : false;
    if (alreadyManager) {
      throw new Error('error.configuration.managerAlreadyAdded');
    }

    const invitationToken = generateToken();
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + 7 * 24);

    if (!user) {
      const password = 'test12345xy';
      const passwordHashed = hashPassword(password);

      if (!project.configuration) throw new Error('error.configuration.notFound');
      const configuration = project.configuration;

      user = await db.user.create({
        data: {
          email: normalizedEmail,
          name: '',
          emailVerified: null,
          password: passwordHashed,
          inviteToken: invitationToken,
          passwordResetToken: invitationToken,
          passwordResetTokenExpiresAt: expirationDate,
          lastInvited: new Date(),
          language: configuration.userLanguage ?? undefined,
          theme: configuration.userTheme ?? undefined,
        },
      });
    } else {
      user = await db.user.update({
        where: { id: user.id },
        data: {
          inviteToken: invitationToken,
          passwordResetToken: invitationToken,
          passwordResetTokenExpiresAt: expirationDate,
          lastInvited: new Date(),
        },
      });
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

    if (!project.configuration) throw new Error('error.configuration.notFound');

    const managerContext: ProjectManagerInviteContext = {
      projectId: project.id,
      projectName: project.configuration.name,
      projectSlug: project.slug,
      configData: project.configuration as unknown as Record<string, unknown>,
    };

    await sendProjectManagerInvitationEmail(
      normalizedEmail,
      user.name || project.configuration.name,
      invitationToken,
      user.language || 'de',
      managerContext,
    );

    const updated = await getProjectWithConfiguration(projectId);
    return { project: updated };
  });
