import {
  type AdditionalFieldConfig,
  AdditionalFieldType,
  additionalFieldConfigArraySchema,
} from '@/lib/schemas/common';
import { NumberParser } from '@/lib/utils';

const numberParser = new NumberParser('de-DE');

export function readAdditionalFieldConfigs(value: unknown): AdditionalFieldConfig[] {
  const parsed = additionalFieldConfigArraySchema.safeParse(value);
  if (!parsed.success || !parsed.data) return [];
  return parsed.data;
}

export function asConditionDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function asConditionNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = numberParser.parse(value);
    if (parsed != null && Number.isFinite(parsed)) return parsed;
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : null;
  }
  if (
    value &&
    typeof value === 'object' &&
    'toNumber' in value &&
    typeof (value as { toNumber: unknown }).toNumber === 'function'
  ) {
    const asNumber = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(asNumber) ? asNumber : null;
  }
  return null;
}

export function rawAdditionalFields(
  values: unknown,
  configs: AdditionalFieldConfig[] | undefined,
): Record<string, unknown> {
  if (!values || typeof values !== 'object' || Array.isArray(values)) return {};
  const record = values as Record<string, unknown>;
  const byId = new Map((configs ?? []).map((config) => [config.id, config]));
  const raw: Record<string, unknown> = {};
  for (const [id, value] of Object.entries(record)) {
    raw[id] = coerceAdditionalValue(value, byId.get(id));
  }
  return raw;
}

function coerceAdditionalValue(value: unknown, config: AdditionalFieldConfig | undefined): unknown {
  if (!config) return value ?? null;
  if (config.type === AdditionalFieldType.BOOLEAN) {
    return value === true || value === 'true';
  }
  if (config.type === AdditionalFieldType.NUMBER) {
    return asConditionNumber(value);
  }
  if (config.type === AdditionalFieldType.DATE) {
    return asConditionDate(value);
  }
  if (value == null) return '';
  return String(value);
}

type RawRecord = Record<string, unknown>;

export function rawTransactionFields(transaction: RawRecord): Record<string, unknown> {
  return {
    type: typeof transaction.type === 'string' ? transaction.type : '',
    amount: asConditionNumber(transaction.amount),
    date: asConditionDate(transaction.date),
    paymentType: typeof transaction.paymentType === 'string' ? transaction.paymentType : '',
  };
}

export function rawTransactionScope(transaction: RawRecord): Record<string, unknown> {
  return { transaction: rawTransactionFields(transaction) };
}

export function rawNoteScope(note: RawRecord): Record<string, unknown> {
  const createdBy = note.createdBy;
  const createdByName =
    createdBy && typeof createdBy === 'object' && 'name' in createdBy && typeof createdBy.name === 'string'
      ? createdBy.name
      : '';
  return {
    note: {
      text: typeof note.text === 'string' ? note.text : '',
      createdAt: asConditionDate(note.createdAt),
      createdByName,
      public: note.public === true || note.public === 'true',
    },
  };
}

export function rawYearlyFields(
  year: number,
  values: {
    begin: number;
    end: number;
    deposits: number;
    withdrawals: number;
    interest: number;
    interestPaid: number;
    notReclaimed: number;
    interestError: number;
  },
): Record<string, unknown> {
  return { year, ...values };
}

export function rawLenderFields(
  lender: RawRecord,
  additionalConfigs?: AdditionalFieldConfig[],
): Record<string, unknown> {
  return {
    lenderNumber: asConditionNumber(lender.lenderNumber),
    firstName: lender.firstName ?? '',
    lastName: lender.lastName ?? '',
    organisationName: lender.organisationName ?? '',
    type: typeof lender.type === 'string' ? lender.type : '',
    salutation: typeof lender.salutation === 'string' ? lender.salutation : '',
    titlePrefix: lender.titlePrefix ?? '',
    titleSuffix: lender.titleSuffix ?? '',
    street: lender.street ?? '',
    addon: lender.addon ?? '',
    zip: lender.zip ?? '',
    place: lender.place ?? '',
    country: typeof lender.country === 'string' ? lender.country : '',
    email: lender.email ?? '',
    telNo: lender.telNo ?? '',
    iban: lender.iban ?? '',
    bic: lender.bic ?? '',
    balance: asConditionNumber(lender.balance) ?? 0,
    interest: asConditionNumber(lender.interest) ?? 0,
    deposits: asConditionNumber(lender.deposits) ?? 0,
    withdrawals: asConditionNumber(lender.withdrawals) ?? 0,
    interestPaid: asConditionNumber(lender.interestPaid) ?? 0,
    interestError: asConditionNumber(lender.interestError) ?? 0,
    notReclaimed: asConditionNumber(lender.notReclaimed) ?? 0,
    amount: asConditionNumber(lender.amount) ?? 0,
    interestRate: asConditionNumber(lender.interestRate) ?? 0,
    balanceInterestRate: asConditionNumber(lender.balanceInterestRate) ?? 0,
    totalLoans: asConditionNumber(lender.totalLoans) ?? 0,
    activeLoans: asConditionNumber(lender.activeLoans) ?? 0,
    additionalFields: rawAdditionalFields(lender.additionalFields, additionalConfigs),
  };
}

export type RawLoanDates = {
  signDate: unknown;
  endDate: unknown;
  terminationDate: unknown;
  savingsFirstDepositDate: unknown;
  savingsLastDepositDate: unknown;
  repaidDate: unknown;
  repayDate: unknown;
};

export function rawLoanFields(
  loan: RawRecord,
  dates: RawLoanDates,
  additionalConfigs?: AdditionalFieldConfig[],
): Record<string, unknown> {
  return {
    loanNumber: asConditionNumber(loan.loanNumber),
    amount: asConditionNumber(loan.amount),
    interestRate: asConditionNumber(loan.interestRate),
    signDate: asConditionDate(dates.signDate),
    endDate: asConditionDate(dates.endDate),
    terminationDate: asConditionDate(dates.terminationDate),
    terminationType: typeof loan.terminationType === 'string' ? loan.terminationType : '',
    interestPaymentType: typeof loan.interestPaymentType === 'string' ? loan.interestPaymentType : '',
    contractStatus: typeof loan.contractStatus === 'string' ? loan.contractStatus : '',
    isSavingsContract: loan.isSavingsContract === true,
    savingsRateType:
      loan.isSavingsContract === true && typeof loan.savingsRateType === 'string' ? loan.savingsRateType : '',
    savingsMonthlyAmount:
      loan.isSavingsContract === true && loan.savingsRateType === 'FIXED'
        ? asConditionNumber(loan.savingsMonthlyAmount)
        : null,
    savingsDepositCount: loan.isSavingsContract === true ? asConditionNumber(loan.savingsDepositCount) : null,
    savingsFirstDepositDate: loan.isSavingsContract === true ? asConditionDate(dates.savingsFirstDepositDate) : null,
    savingsLastDepositDate: loan.isSavingsContract === true ? asConditionDate(dates.savingsLastDepositDate) : null,
    status: typeof loan.status === 'string' ? loan.status : '',
    balance: asConditionNumber(loan.balance),
    interest: asConditionNumber(loan.interest),
    deposits: asConditionNumber(loan.deposits),
    depositsCount: asConditionNumber(loan.depositsCount) ?? 0,
    withdrawals: asConditionNumber(loan.withdrawals),
    interestPaid: asConditionNumber(loan.interestPaid),
    interestError: asConditionNumber(loan.interestError),
    notReclaimed: asConditionNumber(loan.notReclaimed),
    repaidDate: asConditionDate(dates.repaidDate),
    repayDate: asConditionDate(dates.repayDate),
    isTerminated: loan.isTerminated === true,
    additionalFields: rawAdditionalFields(loan.additionalFields, additionalConfigs),
  };
}
