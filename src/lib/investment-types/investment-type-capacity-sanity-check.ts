import type { LimitationType } from '@prisma/client';
import { isValid } from 'date-fns';
import {
  calcInvestmentTypeMetrics,
  type InvestmentTypeMetricsLoan,
} from '@/lib/investment-types/calc-investment-type-metrics';
import { NumberParser } from '@/lib/utils';

type InvestmentTypeLoan = {
  id: string;
  amount: number;
  signDate: Date | string;
};

type BuildCapacityLoansInput = {
  limitationType: LimitationType;
  loans: InvestmentTypeLoan[];
  signDate: Date | string;
  amount: string;
  currentLoanId?: string;
};

export function buildCapacityLoansForLoanForm({
  limitationType,
  loans,
  signDate,
  amount,
  currentLoanId,
}: BuildCapacityLoansInput): InvestmentTypeMetricsLoan[] {
  const effectiveDate = signDate instanceof Date ? signDate : new Date(signDate);
  const isTotalAmountLimitation = limitationType === 'TOTAL_AMOUNT_OVER_TIME_PERIOD';

  const otherLoans = loans
    .filter((loan) => !currentLoanId || loan.id !== currentLoanId)
    .map((loan) => ({
      id: loan.id,
      amount: loan.amount,
      signDate: new Date(loan.signDate),
    }));

  if (!isValid(effectiveDate)) {
    return otherLoans;
  }

  if (!isTotalAmountLimitation) {
    otherLoans.push({
      id: currentLoanId ?? '__current__',
      amount: 0,
      signDate: effectiveDate,
    });
    return otherLoans;
  }

  const parser = new NumberParser('de-DE');
  const parsedAmount = parser.parse(amount);
  if (parsedAmount !== null && !Number.isNaN(parsedAmount) && parsedAmount > 0) {
    otherLoans.push({
      id: currentLoanId ?? '__current__',
      amount: parsedAmount,
      signDate: effectiveDate,
    });
  }

  return otherLoans;
}

export function isInvestmentTypeCapacityExceeded(usedCapacity: number, capacityLimit: number): boolean {
  return usedCapacity > capacityLimit;
}

export function hasCapacitySanityCheckInputs(
  limitationType: LimitationType,
  signDate: Date | string | null | undefined,
  amount: string,
): boolean {
  if (!signDate) return false;

  const effectiveDate = signDate instanceof Date ? signDate : new Date(signDate);
  if (!isValid(effectiveDate)) return false;

  if (limitationType === 'TOTAL_AMOUNT_OVER_TIME_PERIOD') {
    const parser = new NumberParser('de-DE');
    const parsedAmount = parser.parse(amount);
    return parsedAmount !== null && !Number.isNaN(parsedAmount) && parsedAmount > 0;
  }

  return true;
}

export function evaluateInvestmentTypeCapacitySanityCheck(input: BuildCapacityLoansInput) {
  if (!hasCapacitySanityCheckInputs(input.limitationType, input.signDate, input.amount)) {
    return null;
  }

  const effectiveDate = input.signDate instanceof Date ? input.signDate : new Date(input.signDate);
  const capacityLoans = buildCapacityLoansForLoanForm(input);
  const metrics = calcInvestmentTypeMetrics(
    { limitationType: input.limitationType, loans: capacityLoans },
    effectiveDate,
  );

  if (!isInvestmentTypeCapacityExceeded(metrics.usedCapacity, metrics.capacityLimit)) {
    return null;
  }

  return metrics;
}
