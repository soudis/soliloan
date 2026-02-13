import { getTranslations } from 'next-intl/server';
import { auth } from '../auth';

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

export const authAction = actionClient.use(async ({ next }) => {
  const session = await auth();

  if (!session?.user) {
    throw new Error('error.unauthorized');
  }

  return next({
    ctx: {
      session,
    },
  });
});

export const managerAction = authAction.use(async ({ next, ctx }) => {
  if (!ctx.session.user.isManager) {
    throw new Error('error.unauthorized');
  }
  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

export const adminAction = actionClient.use(async ({ next }) => {
  const session = await auth();

  if (!session?.user.isAdmin) {
    throw new Error('error.unauthorized');
  }

  return next({
    ctx: {
      session,
    },
  });
});

export const projectAction = managerAction
  .inputSchema(
    z.object({
      projectId: z.string(),
    }),
  )
  .use(async ({ next, ctx, clientInput }) => {
    // We re-parse to ensure type safety on the input, though next-safe-action guarantees it matches schema
    // The explicit parse here is redundant IF inputSchema is strict, but good for destructuring safely
    const { projectId } = clientInput as { projectId: string };

    if (!projectId) {
      throw new Error('error.project.notFound');
    }

    if (ctx.session.user.isAdmin) {
      return next({
        ctx: {
          projectId,
          project: null, // Optimization: don't fetch if admin, or fetch if needed? Keeping it light.
        },
      });
    }

    const project = await db.project.count({
      where: { id: projectId, managers: { some: { id: ctx.session.user.id } } },
    });

    if (project === 0) {
      throw new Error('error.project.notFound');
    }

    return next({
      ctx: {
        projectId,
      },
    });
  });

export const lenderAction = managerAction
  .inputSchema(
    z.object({
      lenderId: z.string(),
    }),
  )
  .use(async ({ next, ctx, clientInput }) => {
    const { lenderId } = clientInput as { lenderId: string };

    if (!lenderId) {
      throw new Error('error.lender.notFound');
    }

    if (ctx.session.user.isAdmin) {
      return next({
        ctx: {
          lenderId,
        },
      });
    }

    // Check if user manages the project this lender belongs to
    const lender = await db.lender.findUnique({
      where: { id: lenderId },
      select: { projectId: true },
    });

    if (!lender) {
      throw new Error('error.lender.notFound');
    }

    const project = await db.project.count({
      where: { id: lender.projectId, managers: { some: { id: ctx.session.user.id } } },
    });

    if (project === 0) {
      throw new Error('error.lender.notFound');
    }

    return next({
      ctx: {
        lenderId,
      },
    });
  });

export const loanAction = managerAction
  .inputSchema(
    z.object({
      loanId: z.string(),
    }),
  )
  .use(async ({ next, ctx, clientInput }) => {
    const { loanId } = clientInput as { loanId: string };

    if (!loanId) {
      throw new Error('error.loan.notFound');
    }

    if (ctx.session.user.isAdmin) {
      return next({
        ctx: {
          loanId,
        },
      });
    }

    // Check if user manages the project this loan belongs to (via lender)
    const loan = await db.loan.findUnique({
      where: { id: loanId },
      select: { lender: { select: { projectId: true } } },
    });

    if (!loan) {
      throw new Error('error.loan.notFound');
    }

    const project = await db.project.count({
      where: { id: loan.lender.projectId, managers: { some: { id: ctx.session.user.id } } },
    });

    if (project === 0) {
      throw new Error('error.loan.notFound');
    }

    return next({
      ctx: {
        loanId,
      },
    });
  });

export const configurationAction = managerAction
  .inputSchema(
    z.object({
      configurationId: z.string(),
    }),
  )
  .use(async ({ next, ctx, clientInput }) => {
    const { configurationId } = clientInput as { configurationId: string };

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

    const configuration = await db.configuration.count({
      where: { id: configurationId, project: { managers: { some: { id: ctx.session.user.id } } } },
    });

    if (configuration === 0) {
      throw new Error('error.configuration.notFound');
    }

    return next({
      ctx: {
        configurationId,
      },
    });
  });
export const transactionAction = managerAction
  .inputSchema(
    z.object({
      transactionId: z.string(),
    }),
  )
  .use(async ({ next, ctx, clientInput }) => {
    const { transactionId } = clientInput as { transactionId: string };

    if (!transactionId) {
      throw new Error('error.transaction.notFound');
    }

    if (ctx.session.user.isAdmin) {
      return next({
        ctx: {
          transactionId,
        },
      });
    }

    const transaction = await db.transaction.findUnique({
      where: { id: transactionId },
      select: { loan: { select: { lender: { select: { projectId: true } } } } },
    });

    if (!transaction) {
      throw new Error('error.transaction.notFound');
    }

    const project = await db.project.count({
      where: { id: transaction.loan.lender.projectId, managers: { some: { id: ctx.session.user.id } } },
    });

    if (project === 0) {
      throw new Error('error.transaction.notFound');
    }

    return next({
      ctx: {
        transactionId,
      },
    });
  });

export const fileAction = managerAction
  .inputSchema(
    z.object({
      fileId: z.string(),
    }),
  )
  .use(async ({ next, ctx, clientInput }) => {
    const { fileId } = clientInput as { fileId: string };

    if (!fileId) {
      throw new Error('error.file.notFound');
    }

    if (ctx.session.user.isAdmin) {
      return next({
        ctx: {
          fileId,
        },
      });
    }

    const file = await db.file.findUnique({
      where: { id: fileId },
      select: { lender: { select: { projectId: true } } },
    });

    if (!file) {
      throw new Error('error.file.notFound');
    }

    const project = await db.project.count({
      where: { id: file.lender?.projectId, managers: { some: { id: ctx.session.user.id } } },
    });

    if (project === 0) {
      throw new Error('error.file.notFound');
    }

    return next({
      ctx: {
        fileId,
      },
    });
  });

export const noteAction = managerAction
  .inputSchema(
    z.object({
      noteId: z.string(),
    }),
  )
  .use(async ({ next, ctx, clientInput }) => {
    const { noteId } = clientInput as { noteId: string };

    if (!noteId) {
      throw new Error('error.note.notFound');
    }

    if (ctx.session.user.isAdmin) {
      return next({
        ctx: {
          noteId,
        },
      });
    }

    const note = await db.note.findUnique({
      where: { id: noteId },
      select: { lender: { select: { projectId: true } } },
    });

    if (!note) {
      throw new Error('error.note.notFound');
    }

    const project = await db.project.count({
      where: { id: note.lender?.projectId, managers: { some: { id: ctx.session.user.id } } },
    });

    if (project === 0) {
      throw new Error('error.note.notFound');
    }

    return next({
      ctx: {
        noteId,
      },
    });
  });

export const templateAction = managerAction
  .inputSchema(
    z.object({
      templateId: z.string(),
    }),
  )
  .use(async ({ next, ctx, clientInput }) => {
    const { templateId } = clientInput as { templateId: string };

    if (!templateId) {
      throw new Error('error.template.notFound');
    }

    const template = await db.communicationTemplate.findUnique({
      where: { id: templateId },
      select: { projectId: true, isGlobal: true },
    });

    if (!template) {
      throw new Error('error.template.notFound');
    }

    // Global templates require admin access
    if (template.isGlobal) {
      if (!ctx.session.user.isAdmin) {
        throw new Error('error.template.notFound');
      }
      return next({
        ctx: {
          templateId,
        },
      });
    }

    // Admin can access all project templates
    if (ctx.session.user.isAdmin) {
      return next({
        ctx: {
          templateId,
        },
      });
    }

    // Check if user manages the project this template belongs to
    if (!template.projectId) {
      throw new Error('error.template.notFound');
    }

    const project = await db.project.count({
      where: { id: template.projectId, managers: { some: { id: ctx.session.user.id } } },
    });

    if (project === 0) {
      throw new Error('error.template.notFound');
    }

    return next({
      ctx: {
        templateId,
      },
    });
  });

// Admin-only action for global templates
export const adminAction = authAction.use(async ({ next, ctx }) => {
  if (!ctx.session.user.isAdmin) {
    throw new Error('error.unauthorized');
  }
  return next({
    ctx: {
      session: ctx.session,
    },
  });
});
