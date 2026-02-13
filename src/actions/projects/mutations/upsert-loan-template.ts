'use server';

import { omit } from 'lodash';
import { db } from '@/lib/db';
import { type LoanTemplateFormData, loanTemplateFormSchema } from '@/lib/schemas/configuration';
import { configurationAction } from '@/lib/utils/safe-action';

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

export const upsertLoanTemplateAction = configurationAction
  .inputSchema(loanTemplateFormSchema)
  .action(async ({ parsedInput }) => upsertLoanTemplate(parsedInput));
