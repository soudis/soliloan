import type { AdditionalFieldConfig } from '@/lib/schemas/common';
import type { Configuration, LoanTemplate, Project } from '@prisma/client';

export type ProjectWithConfiguration = Project & {
  hasHistoricTransactions: boolean;
  configuration: Configuration & {
    lenderAdditionalFields: AdditionalFieldConfig[];
    loanAdditionalFields: AdditionalFieldConfig[];
    loanTemplates: LoanTemplate[];
  };
};
