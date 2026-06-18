import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { loanMatchesFilters } from '@/lib/entity-filters/apply-loan-filters';
import { filtersNeedPeriodSnapshot, getFilterDefinitionForField } from '@/lib/entity-filters/filter-definitions';
import { getLoanFilterValue } from '@/lib/entity-filters/get-filter-value';
import {
  createAggregateMetricCache,
  getOrBuildPeriodSnapshot,
} from '@/lib/dashboard/history-table/compute-history-table';
import type { HistoryPeriod } from '@/lib/dashboard/history-table/rollup-period';
import { interestRateAverageWeight } from '@/lib/dashboard/interest-rate-average';
import { getPieChartDiscriminator, type PieChartWidgetConfig } from '@/types/dashboard-widgets/pie-chart';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

import { resolveGroupKey } from '@/lib/dashboard/chart/resolve-group-key';

import { getLoanMetricValue } from './get-loan-metric-value';

export type PieChartSlice = {
  key: string;
  label: string;
  value: number;
};

export type PieChartResult = {
  slices: PieChartSlice[];
  total: number;
};

type GroupAccumulator = {
  label: string;
  sum: number;
  count: number;
  rateWeighted: number;
  weightSum: number;
};

export function computePieChart(
  loans: DashboardLoan[],
  config: PieChartWidgetConfig,
  toDate: Date,
  fieldOptions: EntityFilterFieldOption[],
  locale: string,
  emptyLabel: string,
  otherLabel: string,
  commonT: (key: string, values?: Record<string, string>) => string,
  t: (key: string, values?: Record<string, string | number>) => string,
): PieChartResult {
  const periodEnd = toDate;
  const periodStart = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
  const discPeriod: HistoryPeriod = {
    key: 'pie',
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

  const discriminator = getPieChartDiscriminator(config);
  const fieldDef = getFilterDefinitionForField(fieldOptions, discriminator.groupBy.entity, discriminator.groupBy.field);

  // Building the as-of-date snapshot is the expensive part; skip it unless a filter
  // or the group-by field actually needs it.
  const needsSnapshot =
    filtersNeedPeriodSnapshot(discriminator.filters) ||
    filtersNeedPeriodSnapshot([{ entity: discriminator.groupBy.entity, field: discriminator.groupBy.field }]);

  const groups = new Map<string, GroupAccumulator>();

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

    const measureValue = getLoanMetricValue(loan, config.measure, toDate);

    let acc = groups.get(key);
    if (!acc) {
      acc = { label, sum: 0, count: 0, rateWeighted: 0, weightSum: 0 };
      groups.set(key, acc);
    }

    acc.count += 1;

    if (measureValue === null || Number.isNaN(measureValue)) {
      continue;
    }

    if (config.measure === 'interestRateAvg') {
      const weight = interestRateAverageWeight(loan);
      if (weight > 0) {
        acc.rateWeighted += measureValue * weight;
        acc.weightSum += weight;
      }
    } else {
      acc.sum += measureValue;
    }
  }

  const rawSlices: PieChartSlice[] = [];

  for (const [key, acc] of groups) {
    let value: number;
    if (config.measureAggregation === 'count') {
      value = acc.count;
    } else if (config.measure === 'interestRateAvg') {
      // A rate is never summable: always render the contract-amount weighted
      // average regardless of the selected aggregation.
      value = acc.weightSum > 0 ? acc.rateWeighted / acc.weightSum : 0;
    } else if (config.measureAggregation === 'average') {
      value = acc.count > 0 ? acc.sum / acc.count : 0;
    } else {
      value = acc.sum;
    }
    if (config.measureAggregation !== 'count' && config.measure !== 'loanCount' && acc.count === 0) {
      continue;
    }
    rawSlices.push({ key, label: acc.label, value });
  }

  rawSlices.sort((a, b) => b.value - a.value);

  const topN = Math.max(1, discriminator.topNCategories);
  if (rawSlices.length <= topN) {
    const total = rawSlices.reduce((s, slice) => s + slice.value, 0);
    return { slices: rawSlices, total };
  }

  const top = rawSlices.slice(0, topN);
  const rest = rawSlices.slice(topN);
  const otherValue = rest.reduce((s, slice) => s + slice.value, 0);

  if (otherValue !== 0) {
    top.push({ key: '__other__', label: otherLabel, value: otherValue });
  }

  const total = top.reduce((s, slice) => s + slice.value, 0);
  return { slices: top, total };
}
