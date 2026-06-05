import moment from 'moment';

import type { LoanMonthlyHistory, LoanMonthlyNumbers } from '@/types/dashboard';

export type CumulativeTimelineEntry = {
  year: number;
  month: number;
  periodEndMs: number;
  cumulative: LoanMonthlyNumbers;
};

const emptyNumbers = (): LoanMonthlyNumbers => ({
  begin: 0,
  end: 0,
  withdrawals: 0,
  deposits: 0,
  notReclaimed: 0,
  interestPaid: 0,
  interest: 0,
  interestError: 0,
});

export function buildCumulativeTimeline(history: LoanMonthlyHistory): CumulativeTimelineEntry[] {
  const entries: CumulativeTimelineEntry[] = [];
  const running = emptyNumbers();
  let firstBegin: number | null = null;

  const yearKeys = Object.keys(history)
    .map(Number)
    .sort((a, b) => a - b);

  for (const year of yearKeys) {
    const months = history[year];
    if (!months) {
      continue;
    }
    const monthKeys = Object.keys(months)
      .map(Number)
      .sort((a, b) => a - b);

    for (const month of monthKeys) {
      const entry = months[month];
      if (!entry) {
        continue;
      }
      if (firstBegin === null) {
        firstBegin = entry.begin;
      }
      running.withdrawals += entry.withdrawals;
      running.deposits += entry.deposits;
      running.notReclaimed += entry.notReclaimed;
      running.interestPaid += entry.interestPaid;
      running.interest += entry.interest;
      running.interestError += entry.interestError;
      running.end = entry.end;
      running.begin = firstBegin ?? 0;

      entries.push({
        year,
        month,
        periodEndMs: moment({ year, month: month - 1 }).endOf('month').valueOf(),
        cumulative: { ...running },
      });
    }
  }

  return entries;
}

export function lookupCumulativeAtDate(
  timeline: CumulativeTimelineEntry[],
  periodEnd: Date,
): LoanMonthlyNumbers {
  if (timeline.length === 0) {
    return emptyNumbers();
  }

  const targetMs = moment(periodEnd).endOf('day').valueOf();
  let lo = 0;
  let hi = timeline.length - 1;
  let best = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (timeline[mid].periodEndMs <= targetMs) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (best < 0) {
    return emptyNumbers();
  }
  return timeline[best].cumulative;
}
