'use server';

import { db } from '@/lib/db';
import { idObjectSchema } from '@/lib/schemas/common';
import type { LoanTemplateFormData } from '@/lib/schemas/configuration';
import { configurationAction } from '@/lib/utils/safe-action';

export const deleteLoanTemplate = async (template: Pick<LoanTemplateFormData, 'id'>) => {
  if (!template.id) {
    throw new Error('error.invalidParameters');
  }

  return await db.loanTemplate.delete({
    where: {
      id: template.id,
    },
  });
};

export const deleteLoanTemplateAction = configurationAction
  .inputSchema(idObjectSchema)
  .action(async ({ parsedInput }) => deleteLoanTemplate(parsedInput));
