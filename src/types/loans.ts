import type { Configuration, File, Lender, Loan, Note, Project, Transaction, User } from '@prisma/client';

import type { getLenderById } from '@/app/actions';
import type { AdditionalFieldValues } from '@/lib/schemas/common';

export enum LoanStatus {
  ACTIVE = 'ACTIVE',
  REPAID = 'REPAID',
  TERMINATED = 'TERMINATED',
  NOTDEPOSITED = 'NOTDEPOSITED',
}

export type LoanWithRelations = Loan & {
  lender: Lender & {
    project: Project & {
      configuration: {
        interestMethod: Configuration['interestMethod'];
      };
    };
    notes: (Note & {
      createdBy: Pick<User, 'id' | 'name'>;
    })[];
    files: Omit<File, 'data'>[];
    additionalFields?: AdditionalFieldValues;
  };
  notes: (Note & {
    createdBy: Pick<User, 'id' | 'name'>;
  })[];
  files: Omit<File, 'data'>[];
  transactions: Transaction[];
  additionalFields?: AdditionalFieldValues;
};

export type LoanWithCalculations = NonNullable<Awaited<ReturnType<typeof getLenderById>>['lender']>['loans'][0];
