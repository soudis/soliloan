'use server';

import { db } from '@/lib/db';
import { type LoanTemplateFormData, loanTemplateFormSchema } from '@/lib/schemas/configuration';
import { configurationManageAction } from '@/lib/utils/safe-action';
import { omit } from 'lodash';

export const upsertLoanTemplate = async (template: LoanTemplateFormData) => {
  return await db.loanTemplate.upsert({
    update: { ...omit(template, 'id', 'configurationId') },
    create: {
      ...omit(template, 'id', 'configurationId'),
      configuration: { connect: { id: template.configurationId } },
    },
    where: {
      id: template.id ?? '',
    },
  });
};

export const upsertLoanTemplateAction = configurationManageAction
  .inputSchema(loanTemplateFormSchema)
  .action(async ({ ctx, parsedInput }) => upsertLoanTemplate(parsedInput));
