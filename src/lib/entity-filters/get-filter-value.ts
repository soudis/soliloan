import type { Transaction } from '@prisma/client';
import moment from 'moment';

import { formatTerminationModalities } from '@/lib/table-column-utils';
import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import type { LoanMonthlyNumbers } from '@/types/dashboard';
import { LoanStatus, type LoanWithRelations } from '@/types/loans';
import { getLoanStatus } from '@/lib/calculations/loan-calculations';

import { isLenderAggregateFilterField } from './filter-definitions';

export type PeriodSnapshot = LoanMonthlyNumbers & {
  status: LoanStatus;
};

export function getPeriodSnapshotMetricValue(
  snapshot: PeriodSnapshot | null | undefined,
  field: string,
): number | LoanStatus | undefined {
  if (!snapshot) {
    return undefined;
  }
  if (field === 'balance') {
    return snapshot.end;
  }
  if (field === 'status') {
    return snapshot.status;
  }
  if (field in snapshot) {
    return snapshot[field as keyof LoanMonthlyNumbers];
  }
  return undefined;
}

function getLenderAggregateMetricValue(lender: DashboardLoan['lender'], field: string): unknown {
  if (!isLenderAggregateFilterField(field)) {
    return undefined;
  }
  const value = (lender as Record<string, unknown>)[field];
  return typeof value === 'number' ? value : undefined;
}

export function getLenderDisplayName(lender: DashboardLoan['lender']): string {
  if (lender.organisationName) {
    return lender.organisationName;
  }
  return `${lender.firstName ?? ''} ${lender.lastName ?? ''}`.trim();
}

export function getLenderAddress(lender: DashboardLoan['lender']): string {
  return [lender.street, lender.addon, lender.zip, lender.place].filter(Boolean).join(' ');
}

export function getLenderBanking(lender: DashboardLoan['lender']): string {
  return [lender.iban, lender.bic].filter(Boolean).join(' ');
}

export function getLoanFilterValue(
  loan: DashboardLoan,
  entity: 'loan' | 'lender',
  field: string,
  snapshot: PeriodSnapshot | null,
  commonT: (key: string, values?: Record<string, string>) => string,
): unknown {
  if (entity === 'lender') {
    const lender = loan.lender;
    if (field.startsWith('additionalFields.')) {
      const key = field.replace('additionalFields.', '');
      return lender.additionalFields?.[key];
    }
    switch (field) {
      case 'lenderNumber':
        return lender.lenderNumber;
      case 'type':
        return lender.type;
      case 'name':
        return getLenderDisplayName(lender);
      case 'firstName':
        return lender.firstName;
      case 'lastName':
        return lender.lastName;
      case 'organisationName':
        return lender.organisationName;
      case 'email':
        return lender.email;
      case 'telNo':
        return lender.telNo;
      case 'address':
        return getLenderAddress(lender);
      case 'street':
        return lender.street;
      case 'addon':
        return lender.addon;
      case 'zip':
        return lender.zip;
      case 'place':
        return lender.place;
      case 'country':
        return lender.country;
      case 'banking':
        return getLenderBanking(lender);
      case 'iban':
        return lender.iban;
      case 'bic':
        return lender.bic;
      case 'salutation':
        return lender.salutation;
      case 'notificationType':
        return lender.notificationType;
      case 'amount':
      case 'balance':
      case 'deposits':
      case 'withdrawals':
      case 'notReclaimed':
      case 'interest':
      case 'interestPaid': {
        const lenderAggregate = getLenderAggregateMetricValue(lender, field);
        if (lenderAggregate !== undefined) {
          return lenderAggregate;
        }
        return getPeriodSnapshotMetricValue(snapshot, field);
      }
      default:
        return undefined;
    }
  }

  if (field.startsWith('additionalFields.')) {
    const key = field.replace('additionalFields.', '');
    return loan.additionalFields?.[key];
  }

  switch (field) {
    case 'loanNumber':
      return loan.loanNumber;
    case 'lenderNumber':
      return loan.lender.lenderNumber;
    case 'lenderName':
      return getLenderDisplayName(loan.lender);
    case 'signDate':
      return loan.signDate;
    case 'amount':
      return loan.amount;
    case 'interestRate':
      return loan.interestRate;
    case 'terminationType':
      return loan.terminationType;
    case 'terminationModalities':
      return formatTerminationModalities(loan, commonT);
    case 'repayDate':
      return loan.repayDate;
    case 'altInterestMethod':
      return loan.altInterestMethod;
    case 'contractStatus':
      return loan.contractStatus;
    case 'balance':
    case 'deposits':
    case 'withdrawals':
    case 'notReclaimed':
    case 'interest':
    case 'interestPaid':
    case 'interestError':
      return getPeriodSnapshotMetricValue(snapshot, field);
    case 'status':
      return getPeriodSnapshotMetricValue(snapshot, 'status');
    default:
      return undefined;
  }
}

export function getLoanStatusAtPeriod(
  loan: DashboardLoan & { transactions?: Transaction[] },
  periodEnd: Date,
): LoanStatus {
  if (!loan.transactions?.length) {
    return LoanStatus.NOTDEPOSITED;
  }
  return getLoanStatus(loan as unknown as LoanWithRelations, periodEnd);
}

export function loanHasFirstTransactionInPeriod(
  loan: DashboardLoan & { transactions?: Transaction[] },
  periodStart: Date,
  periodEnd: Date,
): boolean {
  if (!loan.transactions?.length) {
    return false;
  }
  const sorted = [...loan.transactions].sort((a, b) => moment(a.date).valueOf() - moment(b.date).valueOf());
  const first = sorted[0];
  if (!first) {
    return false;
  }
  const d = moment(first.date);
  return d.isSameOrAfter(periodStart, 'day') && d.isSameOrBefore(periodEnd, 'day');
}

export function loanActiveAtPeriodEnd(
  loan: DashboardLoan & { transactions?: Transaction[] },
  periodEnd: Date,
): boolean {
  if (moment(loan.signDate).isAfter(periodEnd, 'day')) {
    return false;
  }
  if (!loan.transactions?.length) {
    return false;
  }
  const status = getLoanStatusAtPeriod(loan, periodEnd);
  return status !== LoanStatus.NOTDEPOSITED;
}
