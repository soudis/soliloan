import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { loanMatchesFilters } from '@/lib/entity-filters/apply-loan-filters';
import { loanActiveAtPeriodEnd } from '@/lib/entity-filters/get-filter-value';
import {
  CUMULATIVE_ONLY_METRICS,
  type HistoryTableAggregation,
  type HistoryTableColumnConfig,
  type HistoryTableWidgetConfig,
} from '@/types/dashboard-widgets/history-table';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

import {
  buildHistoryPeriods,
  buildPrecedingPeriodForStockDelta,
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

const STOCK_COUNT_METRICS = ['loanCount', 'contractAmount'] as const;

function effectiveColumnAggregation(column: HistoryTableColumnConfig): HistoryTableAggregation {
  return CUMULATIVE_ONLY_METRICS.includes(column.metric) ? 'cumulative' : column.aggregation;
}

function isStockCountDelta(column: HistoryTableColumnConfig): boolean {
  return (
    column.aggregation === 'delta' &&
    STOCK_COUNT_METRICS.includes(column.metric as (typeof STOCK_COUNT_METRICS)[number])
  );
}

/** Loans passing column filters are already matched at period end; only apply default "active" rule when unfiltered. */
function countsAsActiveLoanAtPeriodEnd(
  loan: DashboardLoan,
  filters: HistoryTableColumnConfig['filters'],
  periodEnd: Date,
): boolean {
  if (filters.length > 0) {
    return true;
  }
  return loanActiveAtPeriodEnd(loan, periodEnd);
}

export function aggregateMetric(
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
        if (countsAsActiveLoanAtPeriodEnd(loan, column.filters, period.periodEnd)) {
          total += 1;
        }
        break;
      }
      case 'contractAmount': {
        if (countsAsActiveLoanAtPeriodEnd(loan, column.filters, period.periodEnd)) {
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
        if (column.aggregation === 'cumulative') {
          total += getCumulativeNumbers(loan, period).end;
        } else if (periodNumbers) {
          total += periodNumbers.end - periodNumbers.begin;
        }
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

  for (const column of config.columns) {
    if (isStockCountDelta(column)) {
      const cumulativeColumn = { ...column, aggregation: 'cumulative' as const };
      const cumulativeAt = (period: HistoryPeriod) =>
        aggregateMetric(loans, cumulativeColumn, period, config, fieldOptions, commonT) ?? 0;

      let previousStock = 0;
      for (const [index, period] of periods.entries()) {
        if (!cells[period.key]) {
          cells[period.key] = {};
        }
        if (index === 0) {
          const preceding = buildPrecedingPeriodForStockDelta(period, config.periodMode);
          previousStock = cumulativeAt(preceding);
        }
        const cumulative = cumulativeAt(period);
        cells[period.key][column.id] = cumulative - previousStock;
        previousStock = cumulative;
      }
      continue;
    }

    for (const period of periods) {
      if (!cells[period.key]) {
        cells[period.key] = {};
      }
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
