'use server';

import { db } from '@/lib/db';
import { type LoanTemplateFormData, loanTemplateFormSchema } from '@/lib/schemas/configuration';
import { configurationManageAction } from '@/lib/utils/safe-action';

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

export const deleteLoanTemplateAction = configurationManageAction
  .inputSchema(loanTemplateFormSchema)
  .action(async ({ ctx, parsedInput }) => deleteLoanTemplate(parsedInput));
