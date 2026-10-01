import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { resolveGroupKey } from '@/lib/dashboard/chart/resolve-group-key';
import {
  createAggregateMetricCache,
  getOrBuildPeriodSnapshot,
} from '@/lib/dashboard/history-table/compute-history-table';
import type { HistoryPeriod } from '@/lib/dashboard/history-table/rollup-period';
import { computeAllStatValues } from '@/lib/dashboard/stat-widget/compute-stat-value';
import { loanMatchesFilters } from '@/lib/entity-filters/apply-loan-filters';
import { filtersNeedPeriodSnapshot, getFilterDefinitionForField } from '@/lib/entity-filters/filter-definitions';
import { getLoanFilterValue } from '@/lib/entity-filters/get-filter-value';
import {
  AGGREGATION_TABLE_GROUP_SORT_ID,
  type AggregationTableColumnConfig,
  type AggregationTableSortDirection,
  type AggregationTableWidgetConfig,
  getAggregationTableDiscriminator,
} from '@/types/dashboard-widgets/aggregation-table';
import type { StatItemConfig } from '@/types/dashboard-widgets/stat-widget';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

export type AggregationTableCellValues = Record<string, number | null>;

export type AggregationTableRow = {
  key: string;
  label: string;
  values: AggregationTableCellValues;
};

export type AggregationTableResult = {
  rows: AggregationTableRow[];
  totals: AggregationTableCellValues;
};

function columnToStatItem(column: AggregationTableColumnConfig): StatItemConfig {
  return {
    id: column.id,
    title: column.title,
    displayType: 'main',
    metric: column.metric,
    aggregation: column.aggregation,
    deltaRange: column.deltaRange,
    colorCodeSign: column.colorCodeSign === true,
    filters: [],
  };
}

function valuesByColumnId(computed: { stat: StatItemConfig; value: number | null }[]): AggregationTableCellValues {
  const values: AggregationTableCellValues = {};
  for (const entry of computed) {
    values[entry.stat.id] = entry.value;
  }
  return values;
}

function isMissingNumber(value: number | null | undefined): value is null | undefined {
  return value === null || value === undefined || Number.isNaN(value);
}

function tieBreak(a: AggregationTableRow, b: AggregationTableRow, locale: string): number {
  const byLabel = a.label.localeCompare(b.label, locale, { numeric: true, sensitivity: 'base' });
  if (byLabel !== 0) {
    return byLabel;
  }
  return a.key.localeCompare(b.key);
}

export function sortAggregationTableRows(
  rows: AggregationTableRow[],
  sortColumnId: string,
  direction: AggregationTableSortDirection,
  locale: string,
): AggregationTableRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    if (sortColumnId === AGGREGATION_TABLE_GROUP_SORT_ID) {
      const cmp = a.label.localeCompare(b.label, locale, { numeric: true, sensitivity: 'base' });
      if (cmp === 0) {
        return a.key.localeCompare(b.key);
      }
      return direction === 'asc' ? cmp : -cmp;
    }

    const av = a.values[sortColumnId];
    const bv = b.values[sortColumnId];
    const aMissing = isMissingNumber(av);
    const bMissing = isMissingNumber(bv);
    if (aMissing && bMissing) {
      return tieBreak(a, b, locale);
    }
    if (aMissing) {
      return 1;
    }
    if (bMissing) {
      return -1;
    }
    if (av === bv) {
      return tieBreak(a, b, locale);
    }
    const diff = av - bv;
    return direction === 'asc' ? diff : -diff;
  });
  return sorted;
}

export function computeAggregationTable(
  loans: DashboardLoan[],
  config: AggregationTableWidgetConfig,
  toDate: Date,
  fieldOptions: EntityFilterFieldOption[],
  locale: string,
  emptyLabel: string,
  commonT: (key: string, values?: Record<string, string>) => string,
  t: (key: string, values?: Record<string, string | number>) => string,
): AggregationTableResult {
  const periodEnd = toDate;
  const periodStart = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
  const discPeriod: HistoryPeriod = {
    key: 'aggregation-table',
    label: '',
    year: periodEnd.getFullYear(),
    month: periodEnd.getMonth() + 1,
    periodStart,
    periodEnd,
    isPartial: true,
  };
  const cache = createAggregateMetricCache();
  const filterContext = {
    periodEnd,
    periodStart,
    snapshot: null as ReturnType<typeof getOrBuildPeriodSnapshot> | null,
    commonT,
    referenceDate: periodEnd,
  };

  const discriminator = getAggregationTableDiscriminator(config);
  const fieldDef = getFilterDefinitionForField(fieldOptions, discriminator.groupBy.entity, discriminator.groupBy.field);
  const needsSnapshot =
    filtersNeedPeriodSnapshot(discriminator.filters) ||
    filtersNeedPeriodSnapshot([{ entity: discriminator.groupBy.entity, field: discriminator.groupBy.field }]);

  const groups = new Map<string, { label: string; loans: DashboardLoan[] }>();
  const filteredLoans: DashboardLoan[] = [];

  for (const loan of loans) {
    filterContext.snapshot = needsSnapshot ? getOrBuildPeriodSnapshot(loan, discPeriod, 'monthly', cache) : null;

    if (!loanMatchesFilters(loan, discriminator.filters, filterContext, fieldOptions)) {
      continue;
    }

    const rawGroupValue = getLoanFilterValue(
      loan,
      discriminator.groupBy.entity,
      discriminator.groupBy.field,
      filterContext.snapshot,
      commonT,
    );
    const { key, label } = resolveGroupKey(rawGroupValue, discriminator, fieldDef, {
      emptyLabel,
      locale,
      commonT,
      t,
    });

    filteredLoans.push(loan);
    const group = groups.get(key);
    if (group) {
      group.loans.push(loan);
    } else {
      groups.set(key, { label, loans: [loan] });
    }
  }

  const stats = config.columns.map(columnToStatItem);
  const rows: AggregationTableRow[] = [];

  for (const [key, group] of groups) {
    rows.push({
      key,
      label: group.label,
      values:
        stats.length === 0
          ? {}
          : valuesByColumnId(computeAllStatValues(group.loans, stats, toDate, fieldOptions, commonT)),
    });
  }

  const totals =
    stats.length === 0
      ? {}
      : valuesByColumnId(computeAllStatValues(filteredLoans, stats, toDate, fieldOptions, commonT));

  return { rows, totals };
}
