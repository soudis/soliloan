import moment from 'moment';

import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { loanMatchesFilters } from '@/lib/entity-filters/apply-loan-filters';
import { filtersNeedPeriodSnapshot } from '@/lib/entity-filters/filter-definitions';
import { loanActiveAtPeriodEnd, type PeriodSnapshot } from '@/lib/entity-filters/get-filter-value';
import {
  CUMULATIVE_ONLY_METRICS,
  type HistoryTableAggregation,
  type HistoryTableColumnConfig,
  type HistoryTableWidgetConfig,
} from '@/types/dashboard-widgets/history-table';
import type { EntityFilter, EntityFilterFieldOption } from '@/types/entity-filters';

import {
  buildAllLoanMetricCaches,
  collectPeriodsForMetricCaches,
  type LoanMetricCacheMap,
} from './loan-metric-cache';
import {
  buildHistoryPeriods,
  buildPrecedingPeriodForStockDelta,
  buildPeriodSnapshot,
  type HistoryPeriod,
} from './rollup-period';

export type HistoryTableResult = {
  periods: { key: string; label: string }[];
  columns: { id: string; title: string; aggregation: HistoryTableAggregation }[];
  cells: Record<string, Record<string, number | null>>;
};

export type AggregateMetricCache = {
  snapshotByLoanPeriod: Map<string, PeriodSnapshot>;
};

export function createAggregateMetricCache(): AggregateMetricCache {
  return { snapshotByLoanPeriod: new Map() };
}

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

function filtersCacheKey(filters: EntityFilter[]): string {
  if (filters.length === 0) {
    return '__none__';
  }
  return JSON.stringify(
    [...filters]
      .map((f) => ({ entity: f.entity, field: f.field, value: f.value }))
      .sort((a, b) => `${a.entity}:${a.field}`.localeCompare(`${b.entity}:${b.field}`)),
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

function isSignedAfterPeriodEnd(loan: DashboardLoan, periodEnd: Date): boolean {
  return moment(loan.signDate).isAfter(periodEnd, 'day');
}

export function getOrBuildPeriodSnapshot(
  loan: DashboardLoan,
  period: HistoryPeriod,
  periodMode: HistoryTableWidgetConfig['periodMode'],
  cache: AggregateMetricCache | undefined,
): PeriodSnapshot {
  const key = `${loan.id}:${period.key}`;
  const existing = cache?.snapshotByLoanPeriod.get(key);
  if (existing) {
    return existing;
  }
  const snapshot = buildPeriodSnapshot(loan, period, periodMode);
  cache?.snapshotByLoanPeriod.set(key, snapshot);
  return snapshot;
}

export function filterLoansForHistoryColumn(
  loans: DashboardLoan[],
  column: HistoryTableColumnConfig,
  period: HistoryPeriod,
  config: HistoryTableWidgetConfig,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
  cache: AggregateMetricCache | undefined,
): DashboardLoan[] {
  if (column.filters.length === 0) {
    return loans.filter((loan) => !isSignedAfterPeriodEnd(loan, period.periodEnd));
  }

  const needsSnapshot = filtersNeedPeriodSnapshot(column.filters);

  return loans.filter((loan) => {
    if (isSignedAfterPeriodEnd(loan, period.periodEnd)) {
      return false;
    }

    const snapshot = needsSnapshot
      ? getOrBuildPeriodSnapshot(loan, period, config.periodMode, cache)
      : null;

    return loanMatchesFilters(
      loan,
      column.filters,
      {
        periodEnd: period.periodEnd,
        periodStart: period.periodStart,
        snapshot,
        commonT,
      },
      fieldOptions,
    );
  });
}

function getLoanMetrics(
  loan: DashboardLoan,
  period: HistoryPeriod,
  loanMetricCaches: LoanMetricCacheMap | undefined,
) {
  const cached = loanMetricCaches?.get(loan.id);
  if (cached) {
    return {
      periodNumbers: cached.periodByPeriodKey.get(period.key) ?? null,
      cumulative: cached.cumulativeByPeriodKey.get(period.key) ?? null,
    };
  }
  return { periodNumbers: null, cumulative: null };
}

function sumMetricForLoans(
  filtered: DashboardLoan[],
  column: HistoryTableColumnConfig,
  period: HistoryPeriod,
  loanMetricCaches: LoanMetricCacheMap | undefined,
): number | null {
  if (filtered.length === 0) {
    return column.metric === 'loanCount' ? 0 : null;
  }

  let total = 0;
  let weightSum = 0;
  let rateWeighted = 0;

  for (const loan of filtered) {
    const metrics = getLoanMetrics(loan, period, loanMetricCaches);
    const periodNumbers = metrics.periodNumbers;
    const cumulative = metrics.cumulative;

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
          total += cumulative?.end ?? 0;
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

export function aggregateMetric(
  loans: DashboardLoan[],
  column: HistoryTableColumnConfig,
  period: HistoryPeriod,
  config: HistoryTableWidgetConfig,
  fieldOptions: EntityFilterFieldOption[],
  commonT: (key: string, values?: Record<string, string>) => string,
  cache?: AggregateMetricCache,
  loanMetricCaches?: LoanMetricCacheMap,
): number | null {
  const metricCaches =
    loanMetricCaches ??
    buildAllLoanMetricCaches(loans, [period], config.periodMode);

  const filtered = filterLoansForHistoryColumn(
    loans,
    column,
    period,
    config,
    fieldOptions,
    commonT,
    cache,
  );

  return sumMetricForLoans(filtered, column, period, metricCaches);
}

export function formatHistoryPeriodLabel(period: HistoryPeriod, untilNowLabel: string): string {
  if (!period.isPartial) {
    return period.label;
  }
  return `${period.label} (${untilNowLabel})`;
}

function groupColumnsByFilters(columns: HistoryTableColumnConfig[]): Map<string, HistoryTableColumnConfig[]> {
  const groups = new Map<string, HistoryTableColumnConfig[]>();
  for (const column of columns) {
    const key = filtersCacheKey(column.filters);
    const group = groups.get(key);
    if (group) {
      group.push(column);
    } else {
      groups.set(key, [column]);
    }
  }
  return groups;
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
  const snapshotCache = createAggregateMetricCache();
  const periods = buildHistoryPeriods(loans, config.periodMode, config.periodCount, toDate, formatMonthLabel);
  const columns = config.columns.map((c) => ({
    id: c.id,
    title: c.title,
    aggregation: effectiveColumnAggregation(c),
  }));
  const cells: Record<string, Record<string, number | null>> = {};

  const precedingPeriods: HistoryPeriod[] = [];
  for (const column of config.columns) {
    if (isStockCountDelta(column) && periods.length > 0) {
      precedingPeriods.push(buildPrecedingPeriodForStockDelta(periods[0], config.periodMode));
    }
  }

  const allPeriodsForCache = collectPeriodsForMetricCaches(periods, precedingPeriods);
  const loanMetricCaches = buildAllLoanMetricCaches(loans, allPeriodsForCache, config.periodMode);

  const stockDeltaColumns = config.columns.filter(isStockCountDelta);
  const regularColumns = config.columns.filter((c) => !isStockCountDelta(c));
  const filterGroups = groupColumnsByFilters(regularColumns);

  for (const period of periods) {
    if (!cells[period.key]) {
      cells[period.key] = {};
    }

    for (const groupedColumns of filterGroups.values()) {
      const representative = groupedColumns[0];
      const filtered = filterLoansForHistoryColumn(
        loans,
        representative,
        period,
        config,
        fieldOptions,
        commonT,
        snapshotCache,
      );

      for (const column of groupedColumns) {
        const aggregation = effectiveColumnAggregation(column);
        cells[period.key][column.id] = sumMetricForLoans(
          filtered,
          { ...column, aggregation },
          period,
          loanMetricCaches,
        );
      }
    }
  }

  for (const column of stockDeltaColumns) {
    const cumulativeColumn = { ...column, aggregation: 'cumulative' as const };
    let previousStock = 0;

    for (const [index, period] of periods.entries()) {
      if (!cells[period.key]) {
        cells[period.key] = {};
      }

      const filtered = filterLoansForHistoryColumn(
        loans,
        column,
        period,
        config,
        fieldOptions,
        commonT,
        snapshotCache,
      );

      if (index === 0) {
        const preceding = buildPrecedingPeriodForStockDelta(period, config.periodMode);
        const precedingFiltered = filterLoansForHistoryColumn(
          loans,
          column,
          preceding,
          config,
          fieldOptions,
          commonT,
          snapshotCache,
        );
        previousStock = sumMetricForLoans(precedingFiltered, cumulativeColumn, preceding, loanMetricCaches) ?? 0;
      }

      const cumulative = sumMetricForLoans(filtered, cumulativeColumn, period, loanMetricCaches) ?? 0;
      cells[period.key][column.id] = cumulative - previousStock;
      previousStock = cumulative;
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
