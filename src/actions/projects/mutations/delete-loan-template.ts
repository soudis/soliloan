'use server';

import { db } from '@/lib/db';
import { type LoanTemplateFormData, loanTemplateFormSchema } from '@/lib/schemas/configuration';
import { configurationAction } from '@/lib/utils/safe-action';

export const deleteLoanTemplate = async (template: LoanTemplateFormData) => {
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
  .inputSchema(loanTemplateFormSchema)
  .action(async ({ parsedInput }) => deleteLoanTemplate(parsedInput));
