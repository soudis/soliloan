import { getLenderById } from "@/app/actions"
import { Configuration, File, Lender, Loan, Note, Project, Transaction, User } from "@prisma/client"

export enum LoanStatus {
  ACTIVE = "ACTIVE",
  REPAID = "REPAID",
  TERMINATED = "TERMINATED",
  NOTDEPOSITED = "NOTDEPOSITED",
}

export type LoanWithRelations = Loan & {
  lender: Lender & {
    project: Project & {
      configuration: {
        interestMethod: Configuration['interestMethod']
      }
    }
    notes: (Note & {
      createdBy: Pick<User, 'id' | 'name'>
    })[]
    files: Omit<File, 'data'>[]
  }
  notes: (Note & {
    createdBy: Pick<User, 'id' | 'name'>
  })[]
  files: Omit<File, 'data'>[]
  transactions: Transaction[]
}

export type LoanWithCalculations = NonNullable<Awaited<ReturnType<typeof getLenderById>>['lender']>['loans'][0]