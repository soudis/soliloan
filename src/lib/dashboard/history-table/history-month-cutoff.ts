import { type Transaction, TransactionType } from '@prisma/client';
import moment from 'moment';

import type { LoanMonthlyHistory } from '@/types/dashboard';

const FLOW_EPSILON = 0.001;

type FlowTransaction = Pick<Transaction, 'date' | 'type' | 'amount'>;

function findLastHistoryMonth(history: LoanMonthlyHistory): { year: number; month: number } | null {
  let last: { year: number; month: number } | null = null;

  for (const yearStr of Object.keys(history)) {
    const year = Number(yearStr);
    const months = history[year];
    if (!months) {
      continue;
    }
    for (const monthStr of Object.keys(months)) {
      const month = Number(monthStr);
      if (!months[month]) {
        continue;
      }
      if (!last || year > last.year || (year === last.year && month > last.month)) {
        last = { year, month };
      }
    }
  }

  return last;
}

function flowsOnOrBefore(transactions: FlowTransaction[], year: number, month: number, periodEnd: moment.Moment) {
  let deposits = 0;
  let withdrawals = 0;
  let notReclaimed = 0;
  let interestPaid = 0;

  for (const tx of transactions) {
    const date = moment(tx.date);
    if (date.year() !== year || date.month() + 1 !== month || date.isAfter(periodEnd, 'day')) {
      continue;
    }
    const amount = Number(tx.amount);
    switch (tx.type) {
      case TransactionType.WITHDRAWAL:
      case TransactionType.TERMINATION:
        withdrawals += amount;
        break;
      case TransactionType.DEPOSIT:
        deposits += amount;
        break;
      case TransactionType.NOTRECLAIMED:
      case TransactionType.NOTRECLAIMEDPARTIAL:
        notReclaimed += amount;
        break;
      case TransactionType.INTERESTPAYMENT:
        interestPaid += amount;
        break;
      default:
        break;
    }
  }

  return { deposits, withdrawals, notReclaimed, interestPaid };
}

function closeEnough(left: number, right: number): boolean {
  return Math.abs(left - right) < FLOW_EPSILON;
}

/**
 * Closed months count once their last day is on or before `periodEnd`.
 * The loan's latest month also counts when `periodEnd` falls inside it and that
 * bucket's flows match the transactions up to `periodEnd`. That bucket is already
 * calculated through the dashboard date, so a repayment in the open month is included
 * instead of being left on the previous month-end.
 */
export function historyMonthCountsForPeriodEnd(
  history: LoanMonthlyHistory,
  transactions: FlowTransaction[] | undefined,
  year: number,
  month: number,
  periodEnd: Date,
): boolean {
  const end = moment(periodEnd).endOf('day');
  const monthEnd = moment({ year, month: month - 1 }).endOf('month');
  if (!monthEnd.isAfter(end, 'day')) {
    return true;
  }

  const last = findLastHistoryMonth(history);
  if (!last || last.year !== year || last.month !== month || !transactions) {
    return false;
  }

  const monthStart = moment({ year, month: month - 1 }).startOf('month');
  if (end.isBefore(monthStart, 'day')) {
    return false;
  }

  const entry = history[year]?.[month];
  if (!entry) {
    return false;
  }

  const flows = flowsOnOrBefore(transactions, year, month, end);
  return (
    closeEnough(flows.deposits, entry.deposits) &&
    closeEnough(flows.withdrawals, entry.withdrawals) &&
    closeEnough(flows.notReclaimed, entry.notReclaimed) &&
    closeEnough(flows.interestPaid, entry.interestPaid)
  );
}

export function historyHasMonthForPeriodEnd(
  history: LoanMonthlyHistory,
  transactions: FlowTransaction[] | undefined,
  periodEnd: Date,
): boolean {
  for (const yearStr of Object.keys(history)) {
    const year = Number(yearStr);
    const months = history[year];
    if (!months) {
      continue;
    }
    for (const monthStr of Object.keys(months)) {
      const month = Number(monthStr);
      if (months[month] && historyMonthCountsForPeriodEnd(history, transactions, year, month, periodEnd)) {
        return true;
      }
    }
  }
  return false;
}
