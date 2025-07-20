import { getTranslations } from 'next-intl/server';
import { auth } from '../auth';

import { some } from 'lodash';
import { createSafeActionClient } from 'next-safe-action';
import { z } from 'zod';
import { db } from '../db';

export const actionClient = createSafeActionClient({
  // https://next-safe-action.dev/docs/define-actions/create-the-client#handleservererror
  handleServerError: async (error) => {
    const t = await getTranslations();
    console.error('error', error);
    return error.message.startsWith('error.') ? t(error.message) : t('error.serverError');
  },
});

export const managerAction = actionClient.use(async ({ next }) => {
  const session = await auth();

  if (!session?.user.isManager) {
    throw new Error('error.unauthorized');
  }

  return next({
    ctx: {
      session,
    },
  });
});

export const projectManageAction = managerAction
  .inputSchema(
    z.object({
      projectId: z.string(),
    }),
  )
  .use(async ({ next, ctx, clientInput }) => {
    const parsedInput = z
      .object({
        projectId: z.string(),
      })
      .parse(clientInput);

    const { projectId } = parsedInput;

    if (!projectId) {
      throw new Error('error.project.notFound');
    }

    if (ctx.session.user.isAdmin) {
      return next({
        ctx: {
          projectId,
        },
      });
    }

    const project = await db.project.findUnique({
      where: { id: projectId, managers: { some: { id: ctx.session.user.id } } },
    });

    if (!project) {
      throw new Error('error.project.notFound');
    }

    return next({
      ctx: {
        projectId,
      },
    });
  });

export const configurationManageAction = managerAction
  .inputSchema(
    z.object({
      configurationId: z.string(),
    }),
  )
  .use(async ({ next, ctx, clientInput }) => {
    const parsedInput = z
      .object({
        configurationId: z.string(),
      })
      .parse(clientInput);

    const { configurationId } = parsedInput;

    if (!configurationId) {
      throw new Error('error.configuration.notFound');
    }

    if (ctx.session.user.isAdmin) {
      return next({
        ctx: {
          configurationId,
        },
      });
    }

    const configuration = await db.configuration.findUnique({
      where: { id: configurationId, project: { managers: { some: { id: ctx.session.user.id } } } },
    });

    if (!configuration) {
      throw new Error('error.configuration.notFound');
    }

    return next({
      ctx: {
        configurationId,
      },
    });
  });
