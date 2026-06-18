import { ContractStatus, Country, InterestMethod, NotificationType, Salutation, TerminationType } from '@prisma/client';

import { createAdditionalFieldFilters } from '@/lib/table-column-utils';
import type { EntityFilterFieldOption } from '@/types/entity-filters';
import type { ProjectWithConfiguration } from '@/types/projects';

export type DataTableColumnFilterType = 'text' | 'select' | 'multi-select' | 'number' | 'date';

export type DataTableColumnFilterDefinition = {
  type: DataTableColumnFilterType;
  label: string;
  options?: { label: string; value: string }[];
};

const LOAN_STATUS_OPTIONS = [
  { labelKey: 'ACTIVE', value: 'ACTIVE' },
  { labelKey: 'REPAID', value: 'REPAID' },
  { labelKey: 'TERMINATED', value: 'TERMINATED' },
  { labelKey: 'NOTDEPOSITED', value: 'NOTDEPOSITED' },
];

function buildCountryFilterOptions(commonT: (key: string) => string) {
  return Object.values(Country).map((value) => ({
    label: commonT(`countries.${value.toLowerCase()}`),
    value,
  }));
}

export function buildLoanFilterFieldOptions(
  project: ProjectWithConfiguration,
  t: (key: string) => string,
  commonT: (key: string) => string,
): EntityFilterFieldOption[] {
  const loanFilters: Record<string, DataTableColumnFilterDefinition> = {
    loanNumber: { type: 'number', label: t('table.loanNumber') },
    lenderNumber: { type: 'number', label: t('table.lenderNumber') },
    lenderName: { type: 'text', label: t('table.lenderName') },
    signDate: { type: 'date', label: t('table.signDate') },
    amount: { type: 'number', label: t('table.amount') },
    balance: { type: 'number', label: t('table.balance') },
    deposits: { type: 'number', label: t('table.deposits') },
    withdrawals: { type: 'number', label: t('table.withdrawals') },
    notReclaimed: { type: 'number', label: t('table.notReclaimed') },
    interestRate: { type: 'number', label: t('table.interestRate') },
    interest: { type: 'number', label: t('table.interest') },
    interestPaid: { type: 'number', label: t('table.interestPaid') },
    terminationType: {
      type: 'multi-select',
      label: t('table.terminationType'),
      options: Object.entries(TerminationType).map(([key, value]) => ({
        label: commonT(`enums.loan.terminationType.${key}`),
        value,
      })),
    },
    repayDate: { type: 'date', label: t('table.repayDate') },
    status: {
      type: 'select',
      label: t('table.status'),
      options: LOAN_STATUS_OPTIONS.map((o) => ({
        label: commonT(`enums.loan.status.${o.labelKey}`),
        value: o.value,
      })),
    },
    altInterestMethod: {
      type: 'select',
      label: t('table.altInterestMethod'),
      options: Object.entries(InterestMethod).map(([key, value]) => ({
        label: commonT(`enums.interestMethod.${key}`),
        value,
      })),
    },
    contractStatus: {
      type: 'select',
      label: t('table.contractStatus'),
      options: Object.entries(ContractStatus).map(([key, value]) => ({
        label: commonT(`enums.loan.contractStatus.${key}`),
        value,
      })),
    },
    ...createAdditionalFieldFilters('additionalFields', project.configuration.loanAdditionalFields),
  };

  return Object.entries(loanFilters).map(([field, def]) => ({
    field,
    entity: 'loan' as const,
    group: 'loan' as const,
    ...def,
  }));
}

export function buildLenderFilterFieldOptions(
  project: ProjectWithConfiguration,
  t: (key: string) => string,
  tLoans: (key: string) => string,
  commonT: (key: string) => string,
): EntityFilterFieldOption[] {
  const lenderFilters: Record<string, DataTableColumnFilterDefinition> = {
    lenderNumber: { type: 'number', label: t('table.lenderNumber') },
    type: {
      type: 'select',
      label: t('table.type'),
      options: [
        { label: commonT('enums.lender.type.PERSON'), value: 'PERSON' },
        { label: commonT('enums.lender.type.ORGANISATION'), value: 'ORGANISATION' },
      ],
    },
    name: { type: 'text', label: t('table.name') },
    firstName: { type: 'text', label: t('table.firstName') },
    lastName: { type: 'text', label: t('table.lastName') },
    organisationName: { type: 'text', label: t('table.organisationName') },
    email: { type: 'text', label: t('table.email') },
    telNo: { type: 'text', label: t('table.telNo') },
    address: { type: 'text', label: t('table.address') },
    street: { type: 'text', label: t('table.street') },
    addon: { type: 'text', label: t('table.addon') },
    zip: { type: 'text', label: t('table.zip') },
    place: { type: 'text', label: t('table.place') },
    country: {
      type: 'select',
      label: t('table.country'),
      options: buildCountryFilterOptions(commonT),
    },
    banking: { type: 'text', label: t('table.banking') },
    iban: { type: 'text', label: t('table.iban') },
    bic: { type: 'text', label: t('table.bic') },
    salutation: {
      type: 'select',
      label: t('table.salutation'),
      options: Object.entries(Salutation).map(([key, value]) => ({
        label: commonT(`enums.lender.salutation.${key}`),
        value,
      })),
    },
    notificationType: {
      type: 'select',
      label: t('table.notificationType'),
      options: Object.entries(NotificationType).map(([key, value]) => ({
        label: commonT(`enums.lender.notificationType.${key}`),
        value,
      })),
    },
    ...createAdditionalFieldFilters('additionalFields', project.configuration.lenderAdditionalFields),
    amount: { type: 'number', label: tLoans('table.amount') },
    balance: { type: 'number', label: tLoans('table.balance') },
    deposits: { type: 'number', label: tLoans('table.deposits') },
    withdrawals: { type: 'number', label: tLoans('table.withdrawals') },
    notReclaimed: { type: 'number', label: tLoans('table.notReclaimed') },
    interest: { type: 'number', label: tLoans('table.interest') },
    interestPaid: { type: 'number', label: tLoans('table.interestPaid') },
  };

  return Object.entries(lenderFilters).map(([field, def]) => ({
    field,
    entity: 'lender' as const,
    group: 'lender' as const,
    ...def,
  }));
}

export function buildAllFilterFieldOptions(
  project: ProjectWithConfiguration,
  tLoans: (key: string) => string,
  tLenders: (key: string) => string,
  commonT: (key: string) => string,
): EntityFilterFieldOption[] {
  return [
    ...buildLoanFilterFieldOptions(project, tLoans, commonT),
    ...buildLenderFilterFieldOptions(project, tLenders, tLoans, commonT),
  ];
}

export function getFilterDefinitionForField(
  fieldOptions: EntityFilterFieldOption[],
  entity: 'loan' | 'lender',
  field: string,
): DataTableColumnFilterDefinition | undefined {
  return fieldOptions.find((o) => o.entity === entity && o.field === field);
}

export function isDynamicLoanFilterField(field: string): boolean {
  return [
    'balance',
    'deposits',
    'withdrawals',
    'notReclaimed',
    'interest',
    'interestPaid',
    'interestError',
    'status',
  ].includes(field);
}

const LENDER_SNAPSHOT_FILTER_FIELDS = new Set([
  'amount',
  'balance',
  'deposits',
  'withdrawals',
  'notReclaimed',
  'interest',
  'interestPaid',
]);

export function filtersNeedPeriodSnapshot(filters: { entity: 'loan' | 'lender'; field: string }[]): boolean {
  for (const filter of filters) {
    if (filter.entity === 'loan' && isDynamicLoanFilterField(filter.field)) {
      return true;
    }
    if (filter.entity === 'lender' && LENDER_SNAPSHOT_FILTER_FIELDS.has(filter.field)) {
      return true;
    }
  }
  return false;
}
