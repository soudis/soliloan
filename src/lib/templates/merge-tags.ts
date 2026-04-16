// Static merge tag field definitions based on Prisma schema + calculated fields
import type { TemplateDataset } from '@prisma/client';

// Lender fields from Prisma schema + lender-calculations.ts
export const LENDER_FIELDS = [
  // Prisma fields
  'lenderNumber',
  'firstName',
  'lastName',
  'organisationName',
  'type',
  'salutation',
  'titlePrefix',
  'titleSuffix',
  'street',
  'addon',
  'zip',
  'place',
  'country',
  'email',
  'telNo',
  'iban',
  'bic',
  // Computed fields
  'fullName',
  'fullAddress',
  'salutationText',
  // Calculated fields from lender-calculations.ts
  'balance',
  'interest',
  'deposits',
  'withdrawals',
  'interestPaid',
  'interestError',
  'notReclaimed',
  'amount',
  'interestRate',
  'balanceInterestRate',
  'totalLoans',
  'activeLoans',
] as const;

// Loan fields from Prisma schema + loan-calculations.ts
export const LOAN_FIELDS = [
  // Prisma fields
  'loanNumber',
  'amount',
  'interestRate',
  'signDate',
  'signDateLong',
  'endDate',
  'endDateLong',
  'terminationDate',
  'terminationDateLong',
  'terminationType',
  'contractStatus',
  // Calculated fields from loan-calculations.ts
  'status',
  'balance',
  'interest',
  'deposits',
  'withdrawals',
  'interestPaid',
  'interestError',
  'notReclaimed',
  'repaidDate',
  'repaidDateLong',
  'repayDate',
  'repayDateLong',
  'isTerminated',
] as const;

// Transaction fields from Prisma schema
export const TRANSACTION_FIELDS = ['type', 'amount', 'date', 'dateLong', 'paymentType'] as const;

// Note fields from Prisma schema
export const NOTE_FIELDS = ['text', 'createdAt', 'createdAtLong', 'createdByName', 'public'] as const;

// User fields from Prisma schema
export const USER_FIELDS = ['name', 'email'] as const;

// Latest transaction fields (top-level on LOAN dataset)
export const LATEST_TRANSACTION_FIELDS = ['type', 'amount', 'date', 'dateLong', 'paymentType'] as const;

// Lender yearly fields (year-scoped aggregates for `LENDER_YEARLY`)
export const LENDER_YEARLY_FIELDS = [
  'year',
  'begin',
  'end',
  'deposits',
  'withdrawals',
  'interest',
  'interestPaid',
  'notReclaimed',
  'interestError',
] as const;

/** Per-loan yearly aggregates inside `{{#loans}}` for `LENDER_YEARLY`. */
export const LOAN_YEARLY_FIELDS = [
  'year',
  'begin',
  'end',
  'deposits',
  'withdrawals',
  'interest',
  'interestPaid',
  'notReclaimed',
  'interestError',
] as const;

// Project fields
export const PROJECT_FIELDS = ['name', 'slug'] as const;

// Platform fields (global, available on all datasets)
export const PLATFORM_FIELDS = ['name'] as const;

/** Current date / time–independent helpers (locale-formatted at render time). */
export const MISC_FIELDS = ['dateShort', 'dateLong'] as const;

// Configuration fields (project configuration: company info, address, banking)
export const CONFIGURATION_FIELDS = [
  'name',
  'email',
  'telNo',
  'website',
  'street',
  'addon',
  'zip',
  'place',
  'country',
  'fullAddress',
  'iban',
  'bic',
] as const;

// Field types for formatting
export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percent' | 'enum';

export const FIELD_TYPES: Record<string, FieldType> = {
  // Lender
  'lender.lenderNumber': 'number',
  'lender.firstName': 'string',
  'lender.lastName': 'string',
  'lender.fullName': 'string',
  'lender.organisationName': 'string',
  'lender.type': 'enum',
  'lender.salutation': 'enum',
  'lender.salutationText': 'string',
  'lender.titlePrefix': 'string',
  'lender.titleSuffix': 'string',
  'lender.street': 'string',
  'lender.addon': 'string',
  'lender.zip': 'string',
  'lender.place': 'string',
  'lender.country': 'enum',
  'lender.fullAddress': 'string',
  'lender.email': 'string',
  'lender.telNo': 'string',
  'lender.iban': 'string',
  'lender.bic': 'string',
  'lender.balance': 'currency',
  'lender.interest': 'currency',
  'lender.deposits': 'currency',
  'lender.withdrawals': 'currency',
  'lender.interestPaid': 'currency',
  'lender.interestError': 'currency',
  'lender.notReclaimed': 'currency',
  'lender.amount': 'currency',
  'lender.interestRate': 'percent',
  'lender.balanceInterestRate': 'percent',
  'lender.totalLoans': 'number',
  'lender.activeLoans': 'number',
  // Loan
  'loan.loanNumber': 'number',
  'loan.amount': 'currency',
  'loan.interestRate': 'percent',
  'loan.signDate': 'date',
  'loan.signDateLong': 'date',
  'loan.endDate': 'date',
  'loan.endDateLong': 'date',
  'loan.terminationDate': 'date',
  'loan.terminationDateLong': 'date',
  'loan.terminationType': 'enum',
  'loan.contractStatus': 'enum',
  'loan.status': 'enum',
  'loan.balance': 'currency',
  'loan.interest': 'currency',
  'loan.deposits': 'currency',
  'loan.withdrawals': 'currency',
  'loan.interestPaid': 'currency',
  'loan.interestError': 'currency',
  'loan.notReclaimed': 'currency',
  'loan.repaidDate': 'date',
  'loan.repaidDateLong': 'date',
  'loan.repayDate': 'date',
  'loan.repayDateLong': 'date',
  'loan.isTerminated': 'boolean',
  // Transaction
  'transaction.type': 'enum',
  'transaction.amount': 'currency',
  'transaction.date': 'date',
  'transaction.dateLong': 'date',
  'transaction.paymentType': 'enum',
  // Note
  'note.text': 'string',
  'note.createdAt': 'date',
  'note.createdAtLong': 'date',
  'note.createdByName': 'string',
  'note.public': 'boolean',
  // User
  'user.name': 'string',
  'user.email': 'string',
  // Latest Transaction (top-level on LOAN dataset)
  'latestTransaction.type': 'enum',
  'latestTransaction.amount': 'currency',
  'latestTransaction.date': 'date',
  'latestTransaction.dateLong': 'date',
  'latestTransaction.paymentType': 'enum',
  // Lender Yearly
  'lenderYearly.year': 'number',
  'lenderYearly.begin': 'currency',
  'lenderYearly.end': 'currency',
  'lenderYearly.deposits': 'currency',
  'lenderYearly.withdrawals': 'currency',
  'lenderYearly.interest': 'currency',
  'lenderYearly.interestPaid': 'currency',
  'lenderYearly.notReclaimed': 'currency',
  'lenderYearly.interestError': 'currency',
  // Loan Yearly (inside loans loop, LENDER_YEARLY)
  'loanYearly.year': 'number',
  'loanYearly.begin': 'currency',
  'loanYearly.end': 'currency',
  'loanYearly.deposits': 'currency',
  'loanYearly.withdrawals': 'currency',
  'loanYearly.interest': 'currency',
  'loanYearly.interestPaid': 'currency',
  'loanYearly.notReclaimed': 'currency',
  'loanYearly.interestError': 'currency',
  // Platform
  'platform.name': 'string',
  // Misc (current date, etc.)
  'misc.dateShort': 'string',
  'misc.dateLong': 'string',
  // Configuration
  'config.name': 'string',
  'config.email': 'string',
  'config.telNo': 'string',
  'config.website': 'string',
  'config.street': 'string',
  'config.addon': 'string',
  'config.zip': 'string',
  'config.place': 'string',
  'config.country': 'enum',
  'config.fullAddress': 'string',
  'config.iban': 'string',
  'config.bic': 'string',
};

// Loop definitions per dataset
export type LoopDefinition = {
  key: string;
  labelKey: string;
  childPrefix: string;
  parentRequired?: string; // Loop must be inside this parent loop
  availableFields: readonly string[];
  childLoops?: string[];
};

export const LOOP_DEFINITIONS: Record<string, LoopDefinition> = {
  loans: {
    key: 'loans',
    labelKey: 'loops.loans',
    childPrefix: 'loan',
    availableFields: LOAN_FIELDS,
    childLoops: ['transactions', 'loanNotes'],
  },
  transactions: {
    key: 'transactions',
    labelKey: 'loops.transactions',
    childPrefix: 'transaction',
    parentRequired: 'loans', // For LENDER dataset, must be inside loans loop
    availableFields: TRANSACTION_FIELDS,
  },
  notes: {
    key: 'notes',
    labelKey: 'loops.notes',
    childPrefix: 'note',
    availableFields: NOTE_FIELDS,
  },
  loanNotes: {
    key: 'notes',
    labelKey: 'loops.notes',
    childPrefix: 'note',
    parentRequired: 'loans',
    availableFields: NOTE_FIELDS,
  },
  transactionsYearly: {
    key: 'transactionsYearly',
    labelKey: 'loops.transactionsYearly',
    childPrefix: 'transaction',
    parentRequired: 'loans',
    availableFields: TRANSACTION_FIELDS,
  },
  lenders: {
    key: 'lenders',
    labelKey: 'loops.lenders',
    childPrefix: 'lender',
    availableFields: LENDER_FIELDS,
    childLoops: ['loans'],
  },
};

// Dataset configurations
export type DatasetConfig = {
  topLevelFields: { entity: string; fields: readonly string[] }[];
  loops: string[];
};

export const DATASET_CONFIGS: Record<TemplateDataset, DatasetConfig> = {
  USER: {
    topLevelFields: [
      { entity: 'user', fields: USER_FIELDS },
      { entity: 'platform', fields: PLATFORM_FIELDS },
      { entity: 'misc', fields: MISC_FIELDS },
    ],
    loops: [],
  },
  LENDER: {
    topLevelFields: [
      { entity: 'lender', fields: LENDER_FIELDS },
      { entity: 'config', fields: CONFIGURATION_FIELDS },
      { entity: 'platform', fields: PLATFORM_FIELDS },
      { entity: 'misc', fields: MISC_FIELDS },
    ],
    loops: ['loans', 'notes'],
  },
  LOAN: {
    topLevelFields: [
      { entity: 'loan', fields: LOAN_FIELDS },
      { entity: 'lender', fields: LENDER_FIELDS },
      { entity: 'latestTransaction', fields: LATEST_TRANSACTION_FIELDS },
      { entity: 'config', fields: CONFIGURATION_FIELDS },
      { entity: 'platform', fields: PLATFORM_FIELDS },
      { entity: 'misc', fields: MISC_FIELDS },
    ],
    loops: ['transactions', 'notes'],
  },
  TRANSACTION: {
    topLevelFields: [
      { entity: 'loan', fields: LOAN_FIELDS },
      { entity: 'lender', fields: LENDER_FIELDS },
      { entity: 'transaction', fields: TRANSACTION_FIELDS },
      { entity: 'config', fields: CONFIGURATION_FIELDS },
      { entity: 'platform', fields: PLATFORM_FIELDS },
      { entity: 'misc', fields: MISC_FIELDS },
    ],
    loops: ['transactions', 'notes'],
  },
  PROJECT: {
    topLevelFields: [
      { entity: 'project', fields: PROJECT_FIELDS },
      { entity: 'config', fields: CONFIGURATION_FIELDS },
      { entity: 'platform', fields: PLATFORM_FIELDS },
      { entity: 'misc', fields: MISC_FIELDS },
    ],
    loops: ['lenders'],
  },
  PROJECT_YEARLY: {
    topLevelFields: [
      { entity: 'project', fields: PROJECT_FIELDS },
      { entity: 'config', fields: CONFIGURATION_FIELDS },
      { entity: 'platform', fields: PLATFORM_FIELDS },
      { entity: 'misc', fields: MISC_FIELDS },
    ],
    loops: ['lenders'],
  },
  LENDER_YEARLY: {
    topLevelFields: [
      { entity: 'lender', fields: LENDER_FIELDS },
      { entity: 'lenderYearly', fields: LENDER_YEARLY_FIELDS },
      { entity: 'config', fields: CONFIGURATION_FIELDS },
      { entity: 'platform', fields: PLATFORM_FIELDS },
      { entity: 'misc', fields: MISC_FIELDS },
    ],
    loops: ['loans', 'notes'],
  },
};

// Build merge tag value syntax
export function buildMergeTagValue(entity: string, field: string): string {
  return `{{${entity}.${field}}}`;
}

// Build loop start/end tags
export function buildLoopTags(loopKey: string): { start: string; end: string } {
  return {
    start: `{{#${loopKey}}}`,
    end: `{{/${loopKey}}}`,
  };
}

/**
 * Get display name for a dataset
 */
export function getDatasetDisplayName(dataset: TemplateDataset): string {
  switch (dataset) {
    case 'USER':
      return 'Benutzer';
    case 'LENDER':
      return 'Darlehensgeber';
    case 'LOAN':
      return 'Darlehen';
    case 'TRANSACTION':
      return 'Transaktion';
    case 'PROJECT':
      return 'Projekt';
    case 'PROJECT_YEARLY':
      return 'Projekt (Jahresübersicht)';
    case 'LENDER_YEARLY':
      return 'Kontomitteilung (jährlich)';
    default:
      return dataset;
  }
}

/** Datasets that show lender/loan/year sample pickers for preview merge data. */
export function needsSampleRecordSelection(dataset: TemplateDataset): boolean {
  return dataset === 'LENDER' || dataset === 'LOAN' || dataset === 'TRANSACTION' || dataset === 'LENDER_YEARLY';
}

/**
 * Whether preview (email iframe / PDF) may open: needs a project context, and for
 * lender/loan/yearly datasets a selected record (and year for `LENDER_YEARLY`).
 */
export function canOpenTemplatePreview(options: {
  dataset: TemplateDataset;
  projectId: string | undefined;
  selectedRecordId: string | null;
  selectedYear: number | null | undefined;
}): boolean {
  const { dataset, projectId, selectedRecordId, selectedYear } = options;
  if (!projectId) return false;

  if (dataset === 'PROJECT' || dataset === 'PROJECT_YEARLY') {
    return true;
  }

  if (dataset === 'LENDER_YEARLY') {
    return selectedRecordId != null && selectedYear != null && Number.isFinite(selectedYear);
  }

  if (dataset === 'LENDER' || dataset === 'LOAN' || dataset === 'TRANSACTION') {
    return selectedRecordId != null;
  }

  return true;
}
