import {
  ContractStatus,
  Country,
  DurationType,
  InterestMethod,
  LenderType,
  PaymentType,
  Salutation,
  TerminationType,
  TransactionType,
} from '@prisma/client';

import type { MigrationWarning } from './types';

export function emptyToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  return value;
}

export function mapLenderType(
  value: string | null | undefined,
  warnings: MigrationWarning[],
  legacyId: number,
): LenderType {
  switch (value?.toLowerCase()) {
    case 'person':
      return LenderType.PERSON;
    case 'organisation':
      return LenderType.ORGANISATION;
    default:
      warnings.push({ entity: 'user', legacyId, message: `Unbekannter Typ "${value}" -> Default PERSON` });
      return LenderType.PERSON;
  }
}

export function mapSalutation(
  value: string | null | undefined,
  warnings: MigrationWarning[],
  legacyId: number,
): Salutation {
  switch (value?.toLowerCase()) {
    case 'personal':
      return Salutation.PERSONAL;
    case 'formal':
      return Salutation.FORMAL;
    default:
      if (value !== null && value !== undefined && value !== '') {
        warnings.push({ entity: 'user', legacyId, message: `Unbekannte Anrede "${value}" -> Default PERSONAL` });
      }
      return Salutation.PERSONAL;
  }
}

const COUNTRY_VALUES = new Set<string>(Object.values(Country));

export function mapCountry(
  value: string | null | undefined,
  warnings: MigrationWarning[],
  legacyId: number,
): Country | null {
  const code = emptyToNull(value);
  if (!code) return null;
  const upper = code.toUpperCase();
  if (COUNTRY_VALUES.has(upper)) return upper as Country;
  warnings.push({ entity: 'user', legacyId, message: `Unbekannter Ländercode "${value}" -> null` });
  return null;
}

export function mapTerminationType(value: string): TerminationType {
  switch (value) {
    case 'T':
      return TerminationType.TERMINATION;
    case 'D':
      return TerminationType.ENDDATE;
    case 'P':
      return TerminationType.DURATION;
    default:
      return TerminationType.TERMINATION;
  }
}

export function mapTerminationPeriodType(
  value: string | null | undefined,
  warnings: MigrationWarning[],
  legacyId: number,
): DurationType | null {
  if (!value) return null;
  switch (value.toUpperCase()) {
    case 'M':
      return DurationType.MONTHS;
    case 'Y':
      return DurationType.YEARS;
    case 'W':
      warnings.push({
        entity: 'contract',
        legacyId,
        message: `termination_period_type "w" (Wochen) nicht unterstützt -> null`,
      });
      return null;
    default:
      return null;
  }
}

const INTEREST_METHOD_MAP: Record<string, InterestMethod> = {
  '365_compound': InterestMethod.ACT_365_COMPOUND,
  '365_nocompound': InterestMethod.ACT_365_NOCOMPOUND,
  ACT_nocompound: InterestMethod.ACT_365_NOCOMPOUND,
  ACT_compound: InterestMethod.ACT_365_COMPOUND,
  '30E360_compound': InterestMethod.E30_360_COMPOUND,
  '30E360_nocompound': InterestMethod.E30_360_NOCOMPOUND,
  ACT_360_compound: InterestMethod.ACT_360_COMPOUND,
  ACT_360_nocompound: InterestMethod.ACT_360_NOCOMPOUND,
  ACT_ACT_compound: InterestMethod.ACT_ACT_COMPOUND,
  ACT_ACT_nocompound: InterestMethod.ACT_ACT_NOCOMPOUND,
};

export function mapInterestMethod(
  value: string | null | undefined,
  warnings: MigrationWarning[],
  legacyId: number,
): InterestMethod | null {
  const v = emptyToNull(value);
  if (!v) return null;
  const mapped = INTEREST_METHOD_MAP[v];
  if (mapped) return mapped;
  warnings.push({ entity: 'contract', legacyId, message: `Unbekannte Zinsmethode "${value}" -> null` });
  return null;
}

export function mapContractStatus(value: string): ContractStatus {
  return value === 'complete' ? ContractStatus.COMPLETED : ContractStatus.PENDING;
}

export function mapTransactionType(value: string): TransactionType {
  switch (value) {
    case 'initial':
    case 'deposit':
      return TransactionType.DEPOSIT;
    case 'withdrawal':
      return TransactionType.WITHDRAWAL;
    case 'termination':
      return TransactionType.TERMINATION;
    case 'notreclaimed':
      return TransactionType.NOTRECLAIMED;
    case 'notreclaimedpartial':
      return TransactionType.NOTRECLAIMEDPARTIAL;
    case 'interestpayment':
      return TransactionType.INTERESTPAYMENT;
    default:
      return TransactionType.DEPOSIT;
  }
}

export function mapPaymentType(value: string | null | undefined): PaymentType {
  switch (value?.toLowerCase()) {
    case 'bank':
      return PaymentType.BANK;
    case 'cash':
      return PaymentType.CASH;
    default:
      return PaymentType.OTHER;
  }
}

export function mapLenderNames(
  lenderType: LenderType,
  user: { first_name: string; last_name: string },
): { firstName: string | null; lastName: string | null; organisationName: string | null } {
  if (lenderType === LenderType.ORGANISATION) {
    return {
      firstName: null,
      lastName: null,
      organisationName: emptyToNull(user.first_name),
    };
  }
  return {
    firstName: emptyToNull(user.first_name),
    lastName: emptyToNull(user.last_name),
    organisationName: null,
  };
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export async function ensureUniqueSlug(
  baseSlug: string,
  tx: { project: { findUnique: (args: { where: { slug: string } }) => Promise<unknown> } },
): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await tx.project.findUnique({ where: { slug } });
    if (!existing) return slug;
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}
