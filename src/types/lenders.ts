import { File, Lender, Note, Project, User } from "@prisma/client";
import { LoanWithRelations } from "./loans";

export type LenderWithRelations = Lender & {
  notes: Note[]
  files: File[]
  loans?: Omit<LoanWithRelations, "lender">[];
  user: Pick<User, "id" | "email" | "name" | "lastLogin"> | null;
  project: Project
}
