import type { Configuration, File, Lender, Note, Project, User } from '@prisma/client';

import type { LoanWithRelations } from './loans';

import type { getLenderAction } from '@/actions';
import type { AdditionalFieldValues } from '@/lib/schemas/common';

export type LenderWithRelations = Lender & {
  notes: (Note & {
    createdBy: Pick<User, 'id' | 'name'>;
  })[];
  files: (Omit<File, 'data'> & {
    createdBy: Pick<User, 'id' | 'name'>;
  })[];
  loans?: Omit<LoanWithRelations, 'lender'>[];
  user: Pick<User, 'id' | 'email' | 'name' | 'lastLogin' | 'lastInvited'> | null;
  project: Project & {
    configuration: {
      interestMethod: Configuration['interestMethod'];
    };
  };
  additionalFields?: AdditionalFieldValues;
};

export type LenderWithCalculations = NonNullable<
  NonNullable<Awaited<ReturnType<typeof getLenderAction>>['data']>['lender']
>;
