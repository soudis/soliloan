'use server';

import { db } from '@/lib/db';
import { type LoanTemplateFormData, loanTemplateFormSchema } from '@/lib/schemas/configuration';
import { configurationManageAction } from '@/lib/utils/safe-action';
import { omit } from 'lodash';

export const markLoanTemplateAsDefault = async (template: LoanTemplateFormData) => {
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

export const markLoanTemplateAsDefaultAction = configurationManageAction
  .inputSchema(loanTemplateFormSchema)
  .action(async ({ ctx, parsedInput }) => markLoanTemplateAsDefault(parsedInput));
