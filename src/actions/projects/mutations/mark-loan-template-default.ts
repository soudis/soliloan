'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import type { LoanTemplateFormData } from '@/lib/schemas/configuration';
import { configurationAction } from '@/lib/utils/safe-action';

export const markLoanTemplateAsDefault = async (template: Pick<LoanTemplateFormData, 'id' | 'configurationId'>) => {
  if (!template.id) {
    throw new Error('error.invalidParameters');
  }

  await db.loanTemplate.updateMany({
    where: {
      configurationId: template.configurationId,
    },
    data: { isDefault: false },
  });

  return await db.loanTemplate.update({
    data: { isDefault: true },
    where: {
      id: template.id,
    },
  });
};

export const markLoanTemplateAsDefaultAction = configurationAction
  .inputSchema(z.object({ id: z.string(), configurationId: z.string() }))
  .action(async ({ parsedInput }) => markLoanTemplateAsDefault(parsedInput));
