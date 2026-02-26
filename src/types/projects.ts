import type { CommunicationTemplate, Configuration, LoanTemplate, Project, User } from '@prisma/client';
import type { AdditionalFieldConfig } from '@/lib/schemas/common';

export type ProjectWithConfiguration = Project & {
  hasHistoricTransactions: boolean;
  managers: User[];
  configuration: Configuration & {
    lenderAdditionalFields: AdditionalFieldConfig[];
    loanAdditionalFields: AdditionalFieldConfig[];
    loanTemplates: LoanTemplate[];
  };
  templates: (CommunicationTemplate & {
    createdBy: Pick<User, 'id' | 'name'>;
  })[];
};
