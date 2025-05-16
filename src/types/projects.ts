import type { AdditionalFieldConfig } from '@/lib/schemas/common';
import type { Configuration, Project } from '@prisma/client';

export type ProjectWithConfiguration = Project & {
  configuration: Configuration & {
    lenderAdditionalFields?: AdditionalFieldConfig[];
    loanAdditionalFields?: AdditionalFieldConfig[];
  };
};
