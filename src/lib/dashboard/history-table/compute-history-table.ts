import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { loanMatchesFilters } from '@/lib/entity-filters/apply-loan-filters';
import { loanActiveAtPeriodEnd, loanHasFirstTransactionInPeriod } from '@/lib/entity-filters/get-filter-value';
import {
  CUMULATIVE_ONLY_METRICS,
  type HistoryTableAggregation,
  type HistoryTableColumnConfig,
  type HistoryTableWidgetConfig,
} from '@/types/dashboard-widgets/history-table';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

import {
  buildHistoryPeriods,
  buildPeriodSnapshot,
  getCumulativeNumbers,
  getPeriodNumbers,
  type HistoryPeriod,
} from './rollup-period';

export type HistoryTableResult = {
  periods: { key: string; label: string }[];
  columns: { id: string; title: string; aggregation: HistoryTableAggregation }[];
  cells: Record<string, Record<string, number | null>>;
};

function effectiveColumnAggregation(column: HistoryTableColumnConfig): HistoryTableAggregation {
  return CUMULATIVE_ONLY_METRICS.includes(column.metric) ? 'cumulative' : column.aggregation;
}

function aggregateMetric(
  loans: DashboardLoan[],
  column: HistoryTableColumnConfig,
  period: HistoryPeriod,
  config: HistoryTableWidgetConfig,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
): number | null {
  const filtered = loans.filter((loan) =>
    loanMatchesFilters(
      loan,
      column.filters,
      {
        periodEnd: period.periodEnd,
        periodStart: period.periodStart,
        snapshot: buildPeriodSnapshot(loan, period, config.periodMode),
        commonT,
      },
      fieldOptions,
    ),
  );

  if (filtered.length === 0) {
    return column.metric === 'loanCount' ? 0 : null;
  }

  let total = 0;
  let weightSum = 0;
  let rateWeighted = 0;

  for (const loan of filtered) {
    const periodNumbers = getPeriodNumbers(loan, period, config.periodMode);
    const cumulative = getCumulativeNumbers(loan, period);

    switch (column.metric) {
      case 'loanCount': {
        if (column.aggregation === 'delta') {
          if (loanHasFirstTransactionInPeriod(loan, period.periodStart, period.periodEnd)) {
            total += 1;
          }
        } else if (loanActiveAtPeriodEnd(loan, period.periodEnd)) {
          total += 1;
        }
        break;
      }
      case 'contractAmount': {
        if (column.aggregation === 'delta') {
          if (loanHasFirstTransactionInPeriod(loan, period.periodStart, period.periodEnd)) {
            total += Number(loan.amount);
          }
        } else if (loanActiveAtPeriodEnd(loan, period.periodEnd) && periodNumbers) {
          total += Number(loan.amount);
        }
        break;
      }
      case 'interestRateAvg': {
        if (periodNumbers && periodNumbers.end > 0) {
          rateWeighted += Number(loan.interestRate) * periodNumbers.end;
          weightSum += periodNumbers.end;
        }
        break;
      }
      case 'balance': {
        if (!periodNumbers) {
          break;
        }
        total += column.aggregation === 'delta' ? periodNumbers.end - periodNumbers.begin : periodNumbers.end;
        break;
      }
      case 'deposits':
      case 'withdrawals':
      case 'notReclaimed':
      case 'interest':
      case 'interestPaid':
      case 'interestError': {
        const source = column.aggregation === 'cumulative' ? cumulative : periodNumbers;
        if (!source) {
          break;
        }
        total += source[column.metric];
        break;
      }
      default:
        break;
    }
  }

  if (column.metric === 'interestRateAvg') {
    return weightSum > 0 ? rateWeighted / weightSum : null;
  }

  if (column.metric === 'loanCount' || column.metric === 'contractAmount') {
    return total;
  }

  return filtered.length > 0 ? total : null;
}

export function formatHistoryPeriodLabel(period: HistoryPeriod, untilNowLabel: string): string {
  if (!period.isPartial) {
    return period.label;
  }
  return `${period.label} (${untilNowLabel})`;
}

export function computeHistoryTable(
  loans: DashboardLoan[],
  config: HistoryTableWidgetConfig,
  toDate: Date,
  fieldOptions: EntityFilterFieldOption[],
  formatMonthLabel: (year: number, month: number) => string,
  commonT: (key: string, values?: Record<string, string>) => string,
  untilNowLabel: string,
): HistoryTableResult {
  const periods = buildHistoryPeriods(loans, config.periodMode, config.periodCount, toDate, formatMonthLabel);
  const columns = config.columns.map((c) => ({
    id: c.id,
    title: c.title,
    aggregation: effectiveColumnAggregation(c),
  }));
  const cells: Record<string, Record<string, number | null>> = {};

  for (const period of periods) {
    cells[period.key] = {};
    for (const column of config.columns) {
      const aggregation = effectiveColumnAggregation(column);
      cells[period.key][column.id] = aggregateMetric(
        loans,
        { ...column, aggregation },
        period,
        config,
        fieldOptions,
        commonT,
      );
    }
  }

  return {
    periods: periods.map((p) => ({
      key: p.key,
      label: formatHistoryPeriodLabel(p, untilNowLabel),
    })),
    columns,
    cells,
  };
}
