import { Entity, Operation } from "@prisma/client";

import { auth } from "@/lib/auth";

import type {
  Configuration,
  File,
  Lender,
  Loan,
  Note,
  PrismaClient,
  Transaction,
} from "@prisma/client";

type EntityData =
  | Configuration
  | Lender
  | Loan
  | Transaction
  | Note
  | Partial<File>;

export interface AuditContext {
  user?: {
    id: string;
    name: string;
  };
  lender?: {
    id: string;
    name: string;
    email?: string | null;
  };
  loan?: {
    id: string;
    loanNumber: number;
  };
  transaction?: {
    type: string;
    amount: number;
    date: Date;
  };
  file?: {
    name: string;
  };
}

export async function createAuditEntry(
  prisma: PrismaClient,
  {
    entity,
    operation,
    primaryKey,
    before,
    after,
    context,
    projectId,
  }: {
    entity: Entity;
    operation: Operation;
    primaryKey: string;
    before: unknown;
    after: unknown;
    context: Partial<AuditContext>;
    projectId: string;
  }
) {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }

  return prisma.change.create({
    data: {
      entity,
      operation,
      primaryKey,
      before: before || {},
      after: after || {},
      context: {
        ...context,
        user: {
          id: session.user.id,
          name: session.user.name,
        },
      },
      project: {
        connect: {
          id: projectId,
        },
      },
      committedAt: new Date(),
    },
  });
}

export function getLenderContext(lender: Lender): Partial<AuditContext> {
  return {
    lender: {
      id: lender.id,
      name: lender.organisationName || `${lender.firstName} ${lender.lastName}`,
      email: lender.email,
    },
  };
}

export function getLoanContext(loan: Loan): Partial<AuditContext> {
  return {
    loan: {
      id: loan.id,
      loanNumber: loan.loanNumber,
    },
  };
}

export function getTransactionContext(
  transaction: Transaction
): Partial<AuditContext> {
  return {
    transaction: {
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date,
    },
  };
}

export function getFileContext(file: File): Partial<AuditContext> {
  return {
    file: {
      name: file.name,
    },
  };
}

export function getChangedFields<T extends EntityData>(
  before: Partial<T>,
  after: Partial<T>
): { before: Partial<T>; after: Partial<T> } {
  const changedFields: { before: Partial<T>; after: Partial<T> } = {
    before: {},
    after: {},
  };

  for (const key in after) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changedFields.before[key] = before[key];
      changedFields.after[key] = after[key];
    }
  }

  return changedFields;
}

export function removeNullFields<T extends EntityData>(data: T): Partial<T> {
  const result: Partial<T> = {};

  for (const key in data) {
    if (data[key] !== null && data[key] !== undefined) {
      result[key] = data[key];
    }
  }

  return result;
}
