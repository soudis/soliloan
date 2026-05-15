import type { Configuration, File, Lender, Note, Project, User } from '@prisma/client';
import type { calculateLenderFields } from '@/lib/calculations/lender-calculations';
import type { sanitizeLender } from '@/lib/sanitation/sanitize-lender';
import type { AdditionalFieldValues } from '@/lib/schemas/common';
import type { LoanWithRelations } from './loans';

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
      /** Present when selected in queries (e.g. my-loans) */
      name?: Configuration['name'];
      logo?: Configuration['logo'] | null;
    };
  };
  additionalFields?: AdditionalFieldValues;
};

export type LenderWithCalculations = ReturnType<typeof sanitizeLender>;
export type LenderDetailsWithCalculations = ReturnType<typeof calculateLenderFields>;
