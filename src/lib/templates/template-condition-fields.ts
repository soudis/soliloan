import {
  ContractStatus,
  Country,
  InterestPaymentType,
  type NotificationType,
  PaymentType,
  Salutation,
  SavingsRateType,
  TerminationType,
  TransactionType,
} from '@prisma/client';

import type { MergeTagConfig, MergeTagField } from '@/actions/templates/queries/get-merge-tags';
import type {
  DataTableColumnFilterDefinition,
  DataTableColumnFilterType,
} from '@/lib/entity-filters/filter-definitions';
import { conditionFilterType } from '@/lib/templates/template-condition';
import { LoanStatus } from '@/types/loans';
import type { NumberFilterOperator } from '@/types/number-filter-value';

export type TemplateConditionField = DataTableColumnFilterDefinition & {
  field: string;
  group: string;
};

type Translate = (key: string) => string;

const LENDER_TYPES = ['PERSON', 'ORGANISATION'] as const;
const LOAN_STATUSES = [LoanStatus.ACTIVE, LoanStatus.REPAID, LoanStatus.TERMINATED, LoanStatus.NOTDEPOSITED] as const;

function defaultNumberOperator(field: string): NumberFilterOperator | undefined {
  if (
    field.endsWith('loanNumber') ||
    field.endsWith('lenderNumber') ||
    field.endsWith('interestRate') ||
    field.endsWith('balanceInterestRate') ||
    field.endsWith('.year') ||
    field === 'lenderYearly.year' ||
    field === 'loanYearly.year'
  ) {
    return 'eq';
  }
  return undefined;
}

function enumOptions(
  field: string,
  tCommon: Translate,
  tConditions: Translate,
): { label: string; value: string }[] | undefined {
  const [entity, name] = field.split('.');
  if (!entity || !name || field.split('.').length !== 2) return undefined;

  if (entity === 'lender' && name === 'type') {
    return LENDER_TYPES.map((value) => ({ label: tCommon(`enums.lender.type.${value}`), value }));
  }
  if (entity === 'lender' && name === 'salutation') {
    return (Object.values(Salutation) as string[]).map((value) => ({
      label: tCommon(`enums.lender.salutation.${value}`),
      value,
    }));
  }
  if (entity === 'lender' && name === 'notificationType') {
    return (['ONLINE', 'EMAIL', 'POST'] as NotificationType[]).map((value) => ({
      label: tCommon(`enums.lender.notificationType.${value}`),
      value,
    }));
  }
  if ((entity === 'lender' || entity === 'config') && name === 'country') {
    return (Object.values(Country) as string[]).map((value) => ({
      label: tCommon(`countries.${value.toLowerCase()}`),
      value,
    }));
  }
  if (entity === 'loan' && name === 'status') {
    return LOAN_STATUSES.map((value) => ({ label: tCommon(`enums.loan.status.${value}`), value }));
  }
  if (entity === 'loan' && name === 'interestPaymentType') {
    return (Object.values(InterestPaymentType) as string[]).map((value) => ({
      label: tCommon(`enums.loan.interestPaymentType.${value}`),
      value,
    }));
  }
  if (entity === 'loan' && name === 'terminationType') {
    return (Object.values(TerminationType) as string[]).map((value) => ({
      label: tCommon(`enums.loan.terminationType.${value}`),
      value,
    }));
  }
  if (entity === 'loan' && name === 'contractStatus') {
    return (Object.values(ContractStatus) as string[]).map((value) => ({
      label: tCommon(`enums.loan.contractStatus.${value}`),
      value,
    }));
  }
  if (entity === 'loan' && name === 'savingsRateType') {
    return (Object.values(SavingsRateType) as string[]).map((value) => ({
      label: value === 'FIXED' ? tConditions('savingsRateFixed') : tConditions('savingsRateVarying'),
      value,
    }));
  }
  if ((entity === 'transaction' || entity === 'latestTransaction') && name === 'type') {
    return (Object.values(TransactionType) as string[]).map((value) => ({
      label: tCommon(`enums.transaction.type.${value}`),
      value,
    }));
  }
  if ((entity === 'transaction' || entity === 'latestTransaction') && name === 'paymentType') {
    return (Object.values(PaymentType) as string[]).map((value) => ({
      label: tCommon(`enums.transaction.paymentType.${value}`),
      value,
    }));
  }
  return undefined;
}

function toConditionField(
  field: MergeTagField,
  tCommon: Translate,
  tConditions: Translate,
): TemplateConditionField | null {
  const type: DataTableColumnFilterType | null = field.filterType ?? conditionFilterType(field.key);
  if (!type) return null;
  const selectOptions = field.selectOptions?.map((option) => ({ label: option, value: option }));
  return {
    field: field.key,
    label: field.label,
    group: field.entity,
    type,
    options: enumOptions(field.key, tCommon, tConditions) ?? selectOptions,
    allowEmpty: true,
    defaultOperator: type === 'number' ? defaultNumberOperator(field.key) : undefined,
  };
}

/**
 * Condition fields visible at the current canvas scope: top-level merge tags, child fields of
 * enclosing loops, and project additional fields for lender/loan when that entity is in scope.
 */
export function buildTemplateConditionFields(
  config: MergeTagConfig | null,
  ancestorLoopsInnermostFirst: readonly string[],
  tCommon: Translate,
  tConditions: Translate,
): TemplateConditionField[] {
  if (!config) return [];
  const byKey = new Map<string, TemplateConditionField>();
  const add = (field: MergeTagField) => {
    if (byKey.has(field.key)) return;
    const mapped = toConditionField(field, tCommon, tConditions);
    if (mapped) byKey.set(field.key, mapped);
  };

  for (const field of config.topLevelFields) add(field);
  const loopKeys = new Set(ancestorLoopsInnermostFirst);
  for (const loop of config.loops) {
    if (!loopKeys.has(loop.key)) continue;
    for (const field of loop.childFields) add(field);
  }

  const hasLender = [...byKey.keys()].some((key) => key.startsWith('lender.')) || loopKeys.has('lenders');
  const hasLoan = [...byKey.keys()].some((key) => key.startsWith('loan.')) || loopKeys.has('loans');
  if (hasLender) {
    for (const field of config.additionalFields.lender) add(field);
  }
  if (hasLoan) {
    for (const field of config.additionalFields.loan) add(field);
  }
  return [...byKey.values()];
}
