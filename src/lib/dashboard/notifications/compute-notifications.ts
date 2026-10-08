import { type InterestMethod, InterestPaymentType, Prisma, type Transaction } from '@prisma/client';
import moment from 'moment';

import { calculateLoanPerYear } from '@/lib/calculations/loan-calculations';
import { matchesDateFilter } from '@/lib/entity-filters/filter-matchers';
import { calcInvestmentTypeMetrics } from '@/lib/investment-types/calc-investment-type-metrics';
import { payoutAsOfDate } from '@/lib/processes/yearly-interest';
import { type AdditionalFieldConfig, AdditionalFieldType, type AdditionalFieldValues } from '@/lib/schemas/common';
import { getLenderName } from '@/lib/utils';
import type { NotificationsWidgetConfig } from '@/types/dashboard-widgets/notifications';
import { LoanStatus } from '@/types/loans';
import type { NotificationExtras } from './notification-extras';
import {
  bankImportHref,
  investmentTypesListHref,
  lenderHref,
  loansListHref,
  openLoanStatusFilter,
  processesYearHref,
  repayOverdueDateFilter,
  repaySoonDateFilter,
} from './notification-links';

export const REQUIRED_FIELDS_PAGE_SIZE = 10;

const OPEN_LOAN_STATUSES = new Set<string>([LoanStatus.ACTIVE, LoanStatus.TERMINATED, LoanStatus.NOTDEPOSITED]);

export type NotificationLoan = {
  id: string;
  status: string;
  repayDate?: Date | string | null;
  isSavingsContract: boolean;
  outstandingDepositsCount: number;
  interestPaymentType: InterestPaymentType;
  interestRate: number;
  altInterestMethod: InterestMethod | null;
  interestMethod: InterestMethod;
  signDate: Date | string;
  amount: number;
  investmentTypeId: string | null;
  transactions: Pick<Transaction, 'id' | 'type' | 'date' | 'amount'>[];
};

export type NotificationLender = {
  id: string;
  lenderNumber: number;
  type: 'PERSON' | 'ORGANISATION';
  firstName: string | null;
  lastName: string | null;
  organisationName: string | null;
  titlePrefix: string | null;
  titleSuffix: string | null;
  street: string | null;
  zip: string | null;
  place: string | null;
  country: string | null;
  email: string | null;
  telNo: string | null;
  additionalFields?: AdditionalFieldValues | null;
};

export type MissingLenderField =
  | { kind: 'street' | 'zip' | 'place' | 'country' | 'email' | 'telNo' }
  | { kind: 'additional'; name: string };

export type NotificationRequiredLender = {
  id: string;
  name: string;
  href: string;
  missing: MissingLenderField[];
};

export type NotificationLine =
  | {
      id: string;
      kind: 'openInterest';
      year: number;
      count: number;
      href: string;
    }
  | {
      id: string;
      kind: 'repayOverdue' | 'notDeposited' | 'savingsRateOpen' | 'repaySoon' | 'bankImport' | 'investmentTypeCapacity';
      count: number;
      href: string;
    }
  | {
      id: string;
      kind: 'requiredFields';
      count: number;
      lenders: NotificationRequiredLender[];
    };

export type NotificationProjectConfig = {
  deInvestmentActCompliance: boolean;
  lenderRequiredFields: string[];
  lenderAdditionalFields: AdditionalFieldConfig[];
};

type ComputeNotificationsInput = {
  config: NotificationsWidgetConfig;
  loans: NotificationLoan[];
  lenders: NotificationLender[];
  toDate: Date;
  projectId: string;
  project: NotificationProjectConfig;
  extras: NotificationExtras;
};

function isOpenLoan(loan: NotificationLoan): boolean {
  return OPEN_LOAN_STATUSES.has(loan.status);
}

export function isCurrentInterestYearVisible(toDate: Date): boolean {
  return moment(toDate).month() === 11;
}

function countLoans(loans: NotificationLoan[], predicate: (loan: NotificationLoan) => boolean): number {
  let count = 0;
  for (const loan of loans) {
    if (predicate(loan)) {
      count += 1;
    }
  }
  return count;
}

function unpaidInterestByYear(loan: NotificationLoan, currentYear: number): Map<number, boolean> {
  const perYear = calculateLoanPerYear(
    {
      transactions: loan.transactions,
      interestRate: loan.interestRate,
      altInterestMethod: loan.altInterestMethod,
      lender: {
        project: {
          configuration: { interestMethod: loan.interestMethod },
        },
      },
    } as Parameters<typeof calculateLoanPerYear>[0],
    payoutAsOfDate(currentYear),
  );

  const open = new Map<number, boolean>();
  for (const entry of perYear) {
    if (entry.year > currentYear) {
      continue;
    }
    const unpaid = new Prisma.Decimal(entry.interest).plus(entry.interestPaid).toDecimalPlaces(2);
    open.set(entry.year, unpaid.greaterThan(0));
  }
  return open;
}

function collectOpenInterestYears(loans: NotificationLoan[], toDate: Date): { year: number; count: number }[] {
  const currentYear = moment(toDate).year();
  const showCurrentYear = isCurrentInterestYearVisible(toDate);
  const counts = new Map<number, number>();

  for (const loan of loans) {
    if (loan.interestPaymentType !== InterestPaymentType.YEARLY) {
      continue;
    }
    if (!loan.interestMethod) {
      continue;
    }

    const open = unpaidInterestByYear(loan, currentYear);
    for (const [year, isOpen] of open) {
      if (!isOpen) {
        continue;
      }
      if (year === currentYear && !showCurrentYear) {
        continue;
      }
      counts.set(year, (counts.get(year) ?? 0) + 1);
    }
  }

  return [...counts.entries()].sort((left, right) => left[0] - right[0]).map(([year, count]) => ({ year, count }));
}

function blank(value: string | null | undefined): boolean {
  return value == null || value.trim() === '';
}

export function projectHasPflichtfelder(project: NotificationProjectConfig): boolean {
  if (project.lenderRequiredFields.length > 0) {
    return true;
  }
  return project.lenderAdditionalFields.some((field) => field.required && field.type !== AdditionalFieldType.BOOLEAN);
}

export function missingLenderFields(
  lender: NotificationLender,
  project: NotificationProjectConfig,
): MissingLenderField[] {
  const missing: MissingLenderField[] = [];
  const required = project.lenderRequiredFields;

  if (required.includes('address')) {
    if (blank(lender.street)) missing.push({ kind: 'street' });
    if (blank(lender.zip)) missing.push({ kind: 'zip' });
    if (blank(lender.place)) missing.push({ kind: 'place' });
    if (blank(lender.country)) missing.push({ kind: 'country' });
  }
  if (required.includes('email') && blank(lender.email)) {
    missing.push({ kind: 'email' });
  }
  if (required.includes('telNo') && blank(lender.telNo)) {
    missing.push({ kind: 'telNo' });
  }

  for (const field of project.lenderAdditionalFields) {
    if (!field.required || field.type === AdditionalFieldType.BOOLEAN) {
      continue;
    }
    const value = lender.additionalFields?.[field.id];
    if (value == null || value === '') {
      missing.push({ kind: 'additional', name: field.name });
    }
  }

  return missing;
}

function countExceededInvestmentTypes(extras: NotificationExtras, loans: NotificationLoan[], toDate: Date): number {
  let count = 0;
  for (const investmentType of extras.investmentTypes) {
    const typeLoans = loans
      .filter((loan) => loan.investmentTypeId === investmentType.id)
      .map((loan) => ({
        id: loan.id,
        amount: loan.amount,
        signDate: new Date(loan.signDate),
        status: loan.status as LoanStatus,
      }));
    const metrics = calcInvestmentTypeMetrics(
      { limitationType: investmentType.limitationType, loans: typeLoans },
      toDate,
    );
    if (metrics.usedCapacity > metrics.capacityLimit) {
      count += 1;
    }
  }
  return count;
}

export function computeNotifications(input: ComputeNotificationsInput): NotificationLine[] {
  const { config, loans, lenders, toDate, projectId, project, extras } = input;
  const lines: NotificationLine[] = [];
  const enabled = config.enabled;

  if (enabled.openInterest) {
    for (const year of collectOpenInterestYears(loans, toDate)) {
      lines.push({
        id: `openInterest-${year.year}`,
        kind: 'openInterest',
        year: year.year,
        count: year.count,
        href: processesYearHref(projectId, year.year),
      });
    }
  }

  if (enabled.repayOverdue) {
    const filter = repayOverdueDateFilter();
    const count = countLoans(loans, (loan) => isOpenLoan(loan) && matchesDateFilter(loan.repayDate, filter, toDate));
    if (count > 0) {
      lines.push({
        id: 'repayOverdue',
        kind: 'repayOverdue',
        count,
        href: loansListHref(projectId, [
          { id: 'repayDate', value: { operator: 'olderThan', amount: 1, unit: 'days' } },
          { id: 'status', value: openLoanStatusFilter() },
        ]),
      });
    }
  }

  if (enabled.notDeposited) {
    const count = countLoans(loans, (loan) => loan.status === LoanStatus.NOTDEPOSITED);
    if (count > 0) {
      lines.push({
        id: 'notDeposited',
        kind: 'notDeposited',
        count,
        href: loansListHref(projectId, [{ id: 'status', value: { operator: 'eq', value: LoanStatus.NOTDEPOSITED } }]),
      });
    }
  }

  if (enabled.savingsRateOpen) {
    const count = countLoans(loans, (loan) => loan.isSavingsContract && loan.outstandingDepositsCount > 0);
    if (count > 0) {
      lines.push({
        id: 'savingsRateOpen',
        kind: 'savingsRateOpen',
        count,
        href: loansListHref(projectId, [
          { id: 'isSavingsContract', value: 'true' },
          { id: 'outstandingDepositsCount', value: { operator: 'gt', value: 0 } },
        ]),
      });
    }
  }

  if (enabled.repaySoon) {
    const filter = repaySoonDateFilter(config.repaySoonDays);
    const count = countLoans(loans, (loan) => isOpenLoan(loan) && matchesDateFilter(loan.repayDate, filter, toDate));
    if (count > 0) {
      lines.push({
        id: 'repaySoon',
        kind: 'repaySoon',
        count,
        href: loansListHref(projectId, [
          {
            id: 'repayDate',
            value: { operator: 'next', amount: config.repaySoonDays, unit: 'days' },
          },
          { id: 'status', value: openLoanStatusFilter() },
        ]),
      });
    }
  }

  if (enabled.bankImport && extras.importBatchRowCount > 0) {
    lines.push({
      id: 'bankImport',
      kind: 'bankImport',
      count: extras.importBatchRowCount,
      href: bankImportHref(projectId),
    });
  }

  if (enabled.investmentTypeCapacity && project.deInvestmentActCompliance) {
    const count = countExceededInvestmentTypes(extras, loans, toDate);
    if (count > 0) {
      lines.push({
        id: 'investmentTypeCapacity',
        kind: 'investmentTypeCapacity',
        count,
        href: investmentTypesListHref(projectId),
      });
    }
  }

  if (enabled.requiredFields && projectHasPflichtfelder(project)) {
    const requiredLenders = lenders
      .map((lender) => {
        const missing = missingLenderFields(lender, project);
        if (missing.length === 0) {
          return null;
        }
        const name = getLenderName(lender).trim() || `#${lender.lenderNumber}`;
        return {
          id: lender.id,
          name,
          href: lenderHref(projectId, lender.id),
          missing,
        };
      })
      .filter((lender): lender is NotificationRequiredLender => lender != null)
      .sort((left, right) => left.name.localeCompare(right.name, 'de'));

    if (requiredLenders.length > 0) {
      lines.push({
        id: 'requiredFields',
        kind: 'requiredFields',
        count: requiredLenders.length,
        lenders: requiredLenders,
      });
    }
  }

  return lines;
}
