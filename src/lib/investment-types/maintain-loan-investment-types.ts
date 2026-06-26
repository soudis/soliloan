import { Country, Entity, Operation, type PrismaClient } from '@prisma/client';
import { createAuditEntry, getChangedFields, getLenderContext, getLoanContext } from '@/lib/audit-trail';
import { normalizeLoanInterestRate } from '@/lib/schemas/investment-type';
import { assignOrCreateInvestmentType } from './assign-or-create-investment-type';

export type LoanForMaintenance = {
  id: string;
  interestRate: number;
  investmentTypeId: string | null;
  lender: { id: string; country: Country | null };
  investmentType: { id: string; interestRate: number } | null;
};

export type RuleResult = { fixed: number; skipped: number; investmentTypesCreated: number };
export type MaintainLoanInvestmentTypesResult = RuleResult;

const loanSelect = {
  id: true,
  interestRate: true,
  investmentTypeId: true,
  lender: { select: { id: true, country: true } },
  investmentType: { select: { id: true, interestRate: true } },
} as const;

async function loadLoansForMaintenance(db: PrismaClient, projectId: string): Promise<LoanForMaintenance[]> {
  return db.loan.findMany({
    where: { lender: { projectId } },
    select: loanSelect,
  });
}

async function auditLoanUpdate(
  db: PrismaClient,
  loanId: string,
  before: { investmentTypeId: string | null },
  after: { investmentTypeId: string | null },
  projectId: string,
) {
  const { before: changedBefore, after: changedAfter } = getChangedFields(before, after);
  if (Object.keys(changedBefore).length === 0) return;

  const loan = await db.loan.findUniqueOrThrow({
    where: { id: loanId },
    include: { lender: true },
  });

  await createAuditEntry(db, {
    entity: Entity.loan,
    operation: Operation.UPDATE,
    primaryKey: loanId,
    before: changedBefore,
    after: changedAfter,
    context: {
      ...getLenderContext(loan.lender),
      ...getLoanContext(loan),
    },
    projectId,
  });
}

/** Rule 1: Non-DE lenders may not have an investment type. */
export async function removeInvestmentTypeFromNonGermanLoans(
  db: PrismaClient,
  loans: LoanForMaintenance[],
  projectId: string,
): Promise<RuleResult> {
  let fixed = 0;
  let skipped = 0;

  for (const loan of loans) {
    if (loan.lender.country === Country.DE || !loan.investmentTypeId) {
      skipped++;
      continue;
    }

    const existing = await db.loan.findUniqueOrThrow({
      where: { id: loan.id },
      select: { investmentTypeId: true },
    });

    const updated = await db.loan.update({
      where: { id: loan.id },
      data: { investmentTypeId: null },
      select: { investmentTypeId: true },
    });

    await auditLoanUpdate(db, loan.id, { investmentTypeId: existing.investmentTypeId }, updated, projectId);
    fixed++;
  }

  return { fixed, skipped, investmentTypesCreated: 0 };
}

/** Rule 2: Clear assignments for DE loans with interest rate mismatches;  */
export async function fixGermanLoanInvestmentTypeRateMismatch(
  db: PrismaClient,
  loans: LoanForMaintenance[],
  projectId: string,
): Promise<RuleResult> {
  let fixed = 0;
  let skipped = 0;
  const investmentTypesCreated = 0;

  for (const loan of loans) {
    if (loan.lender.country !== Country.DE || !loan.investmentTypeId || !loan.investmentType) {
      skipped++;
      continue;
    }

    const loanRate = normalizeLoanInterestRate(loan.interestRate);
    const typeRate = normalizeLoanInterestRate(loan.investmentType.interestRate);
    if (loanRate === typeRate) {
      skipped++;
      continue;
    }

    const existing = await db.loan.findUniqueOrThrow({
      where: { id: loan.id },
      select: { investmentTypeId: true },
    });

    const updated = await db.loan.update({
      where: { id: loan.id },
      data: { investmentTypeId: null },
      select: { investmentTypeId: true },
    });

    await auditLoanUpdate(db, loan.id, { investmentTypeId: existing.investmentTypeId }, updated, projectId);
    fixed++;
  }

  return { fixed, skipped, investmentTypesCreated };
}

/** Rule 3: Assign DE loans without an investment type, creating one if needed. */
export async function assignInvestmentTypeToGermanLoansWithoutType(
  db: PrismaClient,
  loans: LoanForMaintenance[],
  projectId: string,
): Promise<RuleResult> {
  let fixed = 0;
  let skipped = 0;
  let investmentTypesCreated = 0;

  for (const loan of loans) {
    if (loan.lender.country !== Country.DE || loan.investmentTypeId) {
      skipped++;
      continue;
    }

    const { id: investmentTypeId, created } = await assignOrCreateInvestmentType(db, {
      projectId,
      interestRate: loan.interestRate,
    });
    if (created) {
      investmentTypesCreated++;
    }

    const existing = await db.loan.findUniqueOrThrow({
      where: { id: loan.id },
      select: { investmentTypeId: true },
    });

    const updated = await db.loan.update({
      where: { id: loan.id },
      data: { investmentTypeId },
      select: { investmentTypeId: true },
    });

    await auditLoanUpdate(db, loan.id, { investmentTypeId: existing.investmentTypeId }, updated, projectId);
    fixed++;
  }

  return { fixed, skipped, investmentTypesCreated };
}

function sumResults(...results: RuleResult[]): MaintainLoanInvestmentTypesResult {
  return results.reduce(
    (acc, r) => ({
      fixed: acc.fixed + r.fixed,
      skipped: acc.skipped + r.skipped,
      investmentTypesCreated: acc.investmentTypesCreated + r.investmentTypesCreated,
    }),
    { fixed: 0, skipped: 0, investmentTypesCreated: 0 },
  );
}

export async function maintainLoanInvestmentTypes(
  db: PrismaClient,
  projectId: string,
): Promise<MaintainLoanInvestmentTypesResult> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { configuration: { select: { deInvestmentActCompliance: true } } },
  });

  if (!project?.configuration.deInvestmentActCompliance) {
    return { fixed: 0, skipped: 0, investmentTypesCreated: 0 };
  }

  const rule1 = await removeInvestmentTypeFromNonGermanLoans(
    db,
    await loadLoansForMaintenance(db, projectId),
    projectId,
  );
  const rule2 = await fixGermanLoanInvestmentTypeRateMismatch(
    db,
    await loadLoansForMaintenance(db, projectId),
    projectId,
  );
  const rule3 = await assignInvestmentTypeToGermanLoansWithoutType(
    db,
    await loadLoansForMaintenance(db, projectId),
    projectId,
  );

  return sumResults(rule1, rule2, rule3);
}
