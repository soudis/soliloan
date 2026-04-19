import type { Configuration, File, Lender, Loan, Note, Project, Transaction, User } from '@prisma/client';
import type { calculateLoanFields } from '@/lib/calculations/loan-calculations';
import type { sanitizeLoan } from '@/lib/sanitation/sanitize-loan';
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
        name?: Configuration['name'];
        logo?: Configuration['logo'] | null;
      };
    };
    notes: (Note & {
      createdBy: Pick<User, 'id' | 'name'>;
    })[];
    files: (Omit<File, 'data'> & {
      createdBy: Pick<User, 'id' | 'name'>;
    })[];
    additionalFields?: AdditionalFieldValues;
  };
  notes: (Note & {
    createdBy: Pick<User, 'id' | 'name'>;
  })[];
  files: (Omit<File, 'data'> & {
    createdBy: Pick<User, 'id' | 'name'>;
  })[];
  transactions: Transaction[];
  additionalFields?: AdditionalFieldValues;
};

export type LoanWithCalculations = ReturnType<typeof sanitizeLoan>;
export type LoanDetailsWithCalculations = ReturnType<typeof calculateLoanFields>;
export type LoanIdentifier = Pick<LoanDetailsWithCalculations, 'id' | 'loanNumber' | 'status'>;
