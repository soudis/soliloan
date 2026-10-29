'use server';

import { z } from 'zod';

import { findFaqToc } from '@/lib/help/find-faq-toc';
import { managerAction } from '@/lib/utils/safe-action';

export const getFaqTocAction = managerAction.inputSchema(z.object({})).action(async ({ ctx }) => {
  return findFaqToc(Boolean(ctx.session.user.isAdmin));
});
