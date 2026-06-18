import { LimitationType } from '@prisma/client';
import { addMonths, endOfDay, startOfDay } from 'date-fns';
import { MAX_TOTAL_AMOUNT_EUR, MAX_UNITS, PERIOD_MONTHS } from '@/lib/schemas/investment-type';
import { LoanStatus } from '@/types/loans';

export type InvestmentTypeMetricsLoan = {
  id: string;
  amount: number;
  signDate: Date;
  status: LoanStatus;
};

type InvestmentTypeMetricsInput = {
  limitationType: LimitationType;
  loans: InvestmentTypeMetricsLoan[];
};

export type InvestmentTypeMetrics = {
  numberOfLoans: number;
  effectiveLoans: InvestmentTypeMetricsLoan[];
  investmentAmount: number;
  usedCapacity: number;
  capacityLimit: number;
  capacityUnit: 'currency' | 'units';
  usedProbe?: TotalAmountProbe;
  effectiveDateProbe?: TotalAmountProbe;
};

export type TotalAmountProbe = {
  effectiveDate: Date;
  effectiveLoans: InvestmentTypeMetricsLoan[];
  totalAmount: number;
};

export function calcInvestmentTypeMetrics(
  investmentType: InvestmentTypeMetricsInput,
  effectiveDate: Date,
): InvestmentTypeMetrics {
  if (investmentType.limitationType === LimitationType.NOT_MORE_THAN_N_UNITS) {
    return calcNotMoreThanNUnitsMetrics(investmentType.loans);
  } else if (investmentType.limitationType === LimitationType.TOTAL_AMOUNT_OVER_TIME_PERIOD) {
    return calcTotalAmountMetrics(investmentType.loans, effectiveDate);
  } else {
    throw new Error(`Invalid limitation type: ${investmentType.limitationType}`);
  }
}

export function calcNotMoreThanNUnitsMetrics(loans: InvestmentTypeMetricsLoan[]): InvestmentTypeMetrics {
  const effectiveLoans = loans.filter((loan) => loan.status !== LoanStatus.REPAID);

  return {
    numberOfLoans: effectiveLoans.length,
    effectiveLoans,
    investmentAmount: calcTotalAmount(effectiveLoans),
    usedCapacity: effectiveLoans.length,
    capacityLimit: MAX_UNITS,
    capacityUnit: 'units',
  };
}

export function calcTotalAmount(loans: InvestmentTypeMetricsLoan[]): number {
  return loans.reduce((sum, loan) => sum + loan.amount, 0);
}

export function calcTotalAmountMetrics(loans: InvestmentTypeMetricsLoan[], effectiveDate: Date): InvestmentTypeMetrics {
  const futureLoans = getFutureLoans(loans, effectiveDate);
  const futureSignDates = futureLoans.map((loan) => loan.signDate);

  const effectiveDateProbe = calcTotalAmountProbe(effectiveDate, loans);
  const futureProbes = calcTotalAmountProbes(loans, futureSignDates);
  const probes = [effectiveDateProbe, ...futureProbes];
  const relevantProbe = pickProbeWithMaximalAmount(probes);

  return {
    numberOfLoans: loans.length,
    effectiveLoans: relevantProbe.effectiveLoans,
    investmentAmount: effectiveDateProbe.totalAmount,
    usedCapacity: relevantProbe.totalAmount,
    capacityLimit: MAX_TOTAL_AMOUNT_EUR,
    capacityUnit: 'currency',
    usedProbe: relevantProbe,
    effectiveDateProbe,
  };
}

function calcTotalAmountProbes(loans: InvestmentTypeMetricsLoan[], probeDates: Date[]): TotalAmountProbe[] {
  return probeDates.map((probeDate) => calcTotalAmountProbe(probeDate, loans));
}

function pickProbeWithMaximalAmount(probes: TotalAmountProbe[]): TotalAmountProbe {
  return probes.reduce((maxProbe, probe) => (probe.totalAmount > maxProbe.totalAmount ? probe : maxProbe));
}

function calcTotalAmountProbe(effectiveDate: Date, loans: InvestmentTypeMetricsLoan[]): TotalAmountProbe {
  const effectiveLoans = getPastLoans(loans, effectiveDate);
  const totalAmount = calcTotalAmount(effectiveLoans);
  return {
    effectiveDate,
    effectiveLoans,
    totalAmount,
  };
}

export function getFutureLoans<T extends InvestmentTypeMetricsLoan>(loans: T[], date: Date): T[] {
  const startDate = startOfDay(date);
  const endDate = endOfDay(addMonths(date, PERIOD_MONTHS));

  return loans.filter((loan) => {
    const signDate = loan.signDate;
    return signDate >= startDate && signDate <= endDate;
  });
}

export function getPastLoans<T extends InvestmentTypeMetricsLoan>(loans: T[], date: Date): T[] {
  const endDate = endOfDay(date);
  const startDate = startOfDay(addMonths(endDate, -PERIOD_MONTHS));

  return loans.filter((loan) => {
    const signDate = loan.signDate;
    return signDate >= startDate && signDate <= endDate;
  });
}
