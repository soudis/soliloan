import type { Configuration, LoanTemplate, Project, User } from '@prisma/client';
import type { AdditionalFieldConfig } from '@/lib/schemas/common';

export type ProjectWithConfiguration = Project & {
  hasHistoricTransactions: boolean;
  managers: User[];
  configuration: Configuration & {
    lenderAdditionalFields: AdditionalFieldConfig[];
    loanAdditionalFields: AdditionalFieldConfig[];
    loanTemplates: LoanTemplate[];
  };
};
