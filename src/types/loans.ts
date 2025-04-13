import { File, Lender, Loan, Note, Project, Transaction } from "@prisma/client"

export enum LoanStatus {
  ACTIVE = "ACTIVE",
  REPAID = "REPAID",
  TERMINATED = "TERMINATED",
  NOTDEPOSITED = "NOTDEPOSITED",
}

export type LoanWithRelations = Loan & {
  lender: Lender & {
    project: Project
    notes: Note[]
    files: File[]
  }
  notes: Note[]
  files: File[]
  transactions: Transaction[]
}

