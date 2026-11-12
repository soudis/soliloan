import type {
  ContractStatus,
  Country,
  DurationType,
  InterestMethod,
  InterestPaymentType,
  LenderRequiredField,
  LenderType,
  NotificationType,
  Salutation,
  TerminationType,
} from '@prisma/client';
import type { AdditionalFieldConfig } from '@/lib/schemas/common';

/** One cell of an import file, typed as far as the file format allows. Dates are `yyyy-mm-dd`. */
export type ImportCell =
  | { t: 's'; v: string }
  | { t: 'n'; v: number; percent?: boolean }
  | { t: 'd'; v: string }
  | { t: 'b'; v: boolean }
  | null;

export type ImportTable = {
  headers: string[];
  rows: ImportCell[][];
  /** Line (CSV) or row (sheet) number in the file for each entry of `rows`, 1-based. */
  rowNumbers: number[];
};

export const IMPORT_DELIMITERS = [';', ',', '\t'] as const;
export type ImportDelimiter = (typeof IMPORT_DELIMITERS)[number];
export const IMPORT_ENCODINGS = ['utf-8', 'windows-1252'] as const;
export type ImportEncoding = (typeof IMPORT_ENCODINGS)[number];

export type ImportFileKind = 'csv' | 'xlsx';

export type ImportFileOptions = {
  sheet?: string | null;
  delimiter?: ImportDelimiter | null;
  encoding?: ImportEncoding | null;
};

export type ParsedImportFile = {
  kind: ImportFileKind;
  /** Worksheet names; empty for CSV. */
  sheets: string[];
  /** The options actually used (detected where the caller gave none). */
  options: { sheet: string | null; delimiter: ImportDelimiter | null; encoding: ImportEncoding | null };
  table: ImportTable;
};

export type DecimalSeparator = ',' | '.';
export type DateOrder = 'DMY' | 'YMD' | 'MDY';

export type ImportFormat = {
  decimalSeparator: DecimalSeparator;
  dateOrder: DateOrder;
};

/**
 * Everything the user decides in the wizard besides the file itself. Defaults and value assignments hold canonical
 * strings: enum values, `yyyy-mm-dd` dates and numbers with a `.` decimal point.
 */
export type ImportSettings = {
  file: ImportFileOptions;
  format: ImportFormat;
  /** System column key → index of the file column. */
  columns: Record<string, number>;
  defaults: Record<string, string>;
  /** System column key → normalised file value → canonical value. */
  valueAssignments: Record<string, Record<string, string>>;
  loanTemplateId: string | null;
};

/** What validation needs to know about the project, loaded once when the wizard opens and again on import. */
export type ImportContext = {
  interestMethod: InterestMethod;
  altInterestMethods: InterestMethod[];
  lenderSalutation: Salutation | null;
  lenderCountry: Country | null;
  lenderRequiredFields: LenderRequiredField[];
  deInvestmentActCompliance: boolean;
  lenderAdditionalFields: AdditionalFieldConfig[];
  loanAdditionalFields: AdditionalFieldConfig[];
  loanTemplates: ImportLoanTemplate[];
  defaultLoanTemplateId: string | null;
  existingLenderNumbers: number[];
  existingLoanNumbers: number[];
  /** Normalised emails and name/address keys of the project's Kreditgeber*innen, for duplicate warnings. */
  existingLenderEmails: string[];
  existingLenderNameKeys: string[];
  investmentTypeRates: number[];
  hasHistoricTransactions: boolean;
  /** Today as `yyyy-mm-dd`, so client and server agree on "the current year". */
  today: string;
};

export type ImportLoanTemplate = {
  id: string;
  name: string;
  terminationType: TerminationType;
  terminationPeriod: number | null;
  terminationPeriodType: DurationType | null;
  duration: number | null;
  durationType: DurationType | null;
  endDate: string | null;
};

export type ImportIssueSeverity = 'error' | 'warning';

export type ImportIssue = {
  severity: ImportIssueSeverity;
  /** Message key below `dashboard.configuration.import.issues`. */
  code: string;
  /** System column the issue belongs to, if any. */
  column?: string;
  params?: Record<string, string | number>;
};

export type ImportLenderData = {
  lenderNumber: number;
  type: LenderType;
  salutation: Salutation;
  titlePrefix: string | null;
  firstName: string | null;
  lastName: string | null;
  titleSuffix: string | null;
  organisationName: string | null;
  email: string | null;
  telNo: string | null;
  street: string | null;
  addon: string | null;
  zip: string | null;
  place: string | null;
  country: Country;
  iban: string | null;
  bic: string | null;
  notificationType: NotificationType;
  additionalFields: Record<string, string>;
};

export type ImportLoanData = {
  loanNumber: number;
  signDate: string;
  amount: number;
  interestRate: number;
  interestPaymentType: InterestPaymentType;
  interestMethod: InterestMethod;
  contractStatus: ContractStatus;
  terminationType: TerminationType;
  endDate: string | null;
  terminationDate: string | null;
  terminationPeriod: number | null;
  terminationPeriodType: DurationType | null;
  duration: number | null;
  durationType: DurationType | null;
  additionalFields: Record<string, string>;
  /** Interest rate of the Anlageart to assign, when the project's compliance setting requires one. */
  investmentTypeRate: number | null;
};

export type ImportOpening = {
  stichtag: string;
  kontostand: number;
  einlagenstand: number;
  zinsuebertrag: number;
};

export type ImportRowResult = {
  /** Index into the table rows. */
  index: number;
  rowNumber: number;
  /** Rows with the same group belong to one Kreditgeber*in. */
  lenderGroup: string;
  lender: ImportLenderData | null;
  loan: ImportLoanData | null;
  opening: ImportOpening | null;
  lenderNote: string | null;
  loanNote: string | null;
  issues: ImportIssue[];
};

export type ImportTotals = {
  loans: number;
  amount: number;
  kontostand: number;
  einlagenstand: number;
  zinsuebertrag: number;
};

export type ImportSummary = {
  lenders: number;
  loans: number;
  rows: number;
  errors: number;
  warnings: number;
  totals: ImportTotals;
  /** Totals per Stichtag (`yyyy-mm-dd`), sorted by date. */
  byStichtag: (ImportTotals & { stichtag: string })[];
};

export type ImportValidationResult = {
  rows: ImportRowResult[];
  /** Issues that concern the whole Import rather than one row. */
  issues: ImportIssue[];
  /** File values of choice columns that neither match an option nor have an assignment, per system column. */
  unknownValues: Record<string, string[]>;
  /** Error and warning counts per system column. */
  columnCounts: Record<string, { errors: number; warnings: number }>;
  summary: ImportSummary;
};
