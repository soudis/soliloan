import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { loanMatchesFilters } from '@/lib/entity-filters/apply-loan-filters';
import { filtersNeedPeriodSnapshot, getFilterDefinitionForField } from '@/lib/entity-filters/filter-definitions';
import { getLoanFilterValue } from '@/lib/entity-filters/get-filter-value';
import {
  createAggregateMetricCache,
  getOrBuildPeriodSnapshot,
} from '@/lib/dashboard/history-table/compute-history-table';
import type { HistoryPeriod } from '@/lib/dashboard/history-table/rollup-period';
import type { ChartDiscriminatorConfig } from '@/types/dashboard-widgets/chart-discriminator';
import type { ChartSeriesConfig } from '@/types/dashboard-widgets/chart-series';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

import { aggregateSeriesSnapshot } from './aggregate-series-snapshot';
import type { ChartDataModel } from './chart-data-model';
import { resolveGroupKey } from './resolve-group-key';

type GroupEntry = {
  key: string;
  label: string;
  loans: DashboardLoan[];
};

export function computeDiscriminatorChartData(
  loans: DashboardLoan[],
  discriminator: ChartDiscriminatorConfig,
  series: ChartSeriesConfig[],
  toDate: Date,
  fieldOptions: EntityFilterFieldOption[],
  locale: string,
  emptyLabel: string,
  otherLabel: string,
  commonT: (key: string, values?: Record<string, string>) => string,
  t: (key: string, values?: Record<string, string | number>) => string,
  resolveSeriesLabel: (col: ChartSeriesConfig, metricLabel: string) => string,
  metricLabel: (metric: ChartSeriesConfig['metric']) => string,
): ChartDataModel {
  const cache = createAggregateMetricCache();
  const periodEnd = toDate;
  const periodStart = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
  const discPeriod: HistoryPeriod = {
    key: 'disc',
    label: '',
    year: periodEnd.getFullYear(),
    month: periodEnd.getMonth() + 1,
    periodStart,
    periodEnd,
    isPartial: true,
  };
  const filterContext = {
    periodEnd,
    periodStart,
    snapshot: null as ReturnType<typeof getOrBuildPeriodSnapshot> | null,
    commonT,
  };

  const fieldDef = getFilterDefinitionForField(fieldOptions, discriminator.groupBy.entity, discriminator.groupBy.field);

  const needsSnapshot =
    filtersNeedPeriodSnapshot(discriminator.filters) ||
    filtersNeedPeriodSnapshot([{ entity: discriminator.groupBy.entity, field: discriminator.groupBy.field }]);

  const groups = new Map<string, GroupEntry>();

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

    let entry = groups.get(key);
    if (!entry) {
      entry = { key, label, loans: [] };
      groups.set(key, entry);
    }
    entry.loans.push(loan);
  }

  // Aggregate each group's series values once. Used both for value-based ranking
  // (consistent with the pie chart) and reused as the final dataset values, so no
  // category is aggregated twice.
  const valuesByGroup = new Map<string, (number | null)[]>();
  for (const group of groups.values()) {
    valuesByGroup.set(
      group.key,
      series.map((col) => aggregateSeriesSnapshot(group.loans, col, toDate, fieldOptions, commonT, cache)),
    );
  }

  const rankingScore = (key: string): number =>
    (valuesByGroup.get(key) ?? []).reduce<number>((sum, value) => sum + (value ?? 0), 0);

  const sorted = [...groups.values()].sort((a, b) => rankingScore(b.key) - rankingScore(a.key));
  const topN = Math.max(1, discriminator.topNCategories);
  let categories: GroupEntry[];

  if (sorted.length <= topN) {
    categories = sorted;
  } else {
    const top = sorted.slice(0, topN);
    const rest = sorted.slice(topN);
    const otherLoans = rest.flatMap((g) => g.loans);
    if (otherLoans.length > 0) {
      const otherEntry: GroupEntry = { key: '__other__', label: otherLabel, loans: otherLoans };
      top.push(otherEntry);
      // Rate/average metrics are not additive, so re-aggregate the combined loans.
      valuesByGroup.set(
        otherEntry.key,
        series.map((col) => aggregateSeriesSnapshot(otherEntry.loans, col, toDate, fieldOptions, commonT, cache)),
      );
    }
    categories = top;
  }

  const labels = categories.map((c) => c.label);
  const datasets = series.map((col, seriesIndex) => ({
    id: col.id,
    label: resolveSeriesLabel(col, metricLabel(col.metric)),
    values: categories.map((cat) => valuesByGroup.get(cat.key)?.[seriesIndex] ?? null),
  }));

  return { labels, datasets };
}
