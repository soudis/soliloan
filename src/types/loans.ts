import { File, Lender, Loan, Note, Project, Transaction, User } from "@prisma/client"

export enum LoanStatus {
  ACTIVE = "ACTIVE",
  REPAID = "REPAID",
  TERMINATED = "TERMINATED",
  NOTDEPOSITED = "NOTDEPOSITED",
}

export type LoanWithRelations = Loan & {
  lender: Lender & {
    project: Project
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

