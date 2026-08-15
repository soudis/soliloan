import { DurationType, TerminationType } from '@prisma/client';
import { isValid } from 'date-fns';
import moment from 'moment';
import { resolveSavingsLastDepositDate } from '@/lib/loans/savings-contract';

export type LoanEndDateSanityCheckInput = {
  terminationType: TerminationType;
  signDate: Date | string | null | undefined;
  endDate: Date | string | null | undefined;
  duration: number | '' | null | undefined;
  durationType: DurationType | null | undefined;
  isSavingsContract: boolean;
  savingsFirstDepositDate: Date | string | null | undefined;
  savingsLastDepositDate: Date | string | null | undefined;
  savingsDepositCount: number | '' | null | undefined;
};

export type LoanEndDateSanityCheckResult = 'beforeSavingsLastDepositDate';

const toDate = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return isValid(date) ? date : null;
};

const isOnOrAfter = (date: Date, reference: Date): boolean =>
  !moment(date).startOf('day').isBefore(moment(reference).startOf('day'));

export function resolveContractEndDate(input: LoanEndDateSanityCheckInput): Date | null {
  if (input.terminationType === TerminationType.ENDDATE) {
    return toDate(input.endDate);
  }

  if (input.terminationType === TerminationType.DURATION) {
    const signDate = toDate(input.signDate);
    if (!signDate || !input.duration || !input.durationType) return null;

    const calculated = moment(signDate).add(
      Number(input.duration),
      input.durationType === DurationType.MONTHS ? 'months' : 'years',
    );
    return calculated.isValid() ? calculated.toDate() : null;
  }

  return null;
}

export function hasFixedTermEndDate(terminationType: TerminationType): boolean {
  return terminationType === TerminationType.ENDDATE || terminationType === TerminationType.DURATION;
}

export function evaluateLoanEndDateSanityChecks(
  input: LoanEndDateSanityCheckInput,
): LoanEndDateSanityCheckResult[] {
  if (!input.isSavingsContract || !hasFixedTermEndDate(input.terminationType)) {
    return [];
  }

  const contractEndDate = resolveContractEndDate(input);
  if (!contractEndDate) return [];

  const depositCount = typeof input.savingsDepositCount === 'number' ? input.savingsDepositCount : null;
  const results: LoanEndDateSanityCheckResult[] = [];

  const savingsLastDepositDate = resolveSavingsLastDepositDate(
    toDate(input.savingsFirstDepositDate),
    toDate(input.savingsLastDepositDate),
    depositCount,
    toDate(input.signDate),
  );

  if (savingsLastDepositDate && !isOnOrAfter(contractEndDate, savingsLastDepositDate)) {
    results.push('beforeSavingsLastDepositDate');
  }

  return results;
}
