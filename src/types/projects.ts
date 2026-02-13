import type { AdditionalFieldConfig } from '@/lib/schemas/common';
import type { Configuration, LoanTemplate, Project, User } from '@prisma/client';

export type ProjectWithConfiguration = Project & {
  hasHistoricTransactions: boolean;
  managers: User[];
  configuration: Configuration & {
    lenderAdditionalFields: AdditionalFieldConfig[];
    loanAdditionalFields: AdditionalFieldConfig[];
    loanTemplates: LoanTemplate[];
  };
};
