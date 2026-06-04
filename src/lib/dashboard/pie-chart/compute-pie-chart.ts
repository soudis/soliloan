import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { loanMatchesFilters } from '@/lib/entity-filters/apply-loan-filters';
import { getFilterDefinitionForField } from '@/lib/entity-filters/filter-definitions';
import { getLoanFilterValue } from '@/lib/entity-filters/get-filter-value';
import { buildPeriodSnapshot } from '@/lib/dashboard/history-table/rollup-period';
import type { PieChartWidgetConfig } from '@/types/dashboard-widgets/pie-chart';
import type { EntityFilterFieldOption } from '@/types/entity-filters';

import { getLoanMetricValue } from './get-loan-metric-value';
import { resolveGroupKey } from './resolve-group-key';

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
  const filterContext = {
    periodEnd,
    periodStart,
    snapshot: null as ReturnType<typeof buildPeriodSnapshot> | null,
    commonT,
  };

  const fieldDef = getFilterDefinitionForField(
    fieldOptions,
    config.groupBy.entity,
    config.groupBy.field,
  );

  const groups = new Map<string, GroupAccumulator>();

  for (const loan of loans) {
    filterContext.snapshot = buildPeriodSnapshot(loan, {
      key: 'pie',
      label: '',
      year: periodEnd.getFullYear(),
      month: periodEnd.getMonth() + 1,
      periodStart,
      periodEnd,
      isPartial: true,
    }, 'monthly');

    if (!loanMatchesFilters(loan, config.filters, filterContext, fieldOptions)) {
      continue;
    }

    const rawGroupValue = getLoanFilterValue(
      loan,
      config.groupBy.entity,
      config.groupBy.field,
      filterContext.snapshot,
      commonT,
    );

    const { key, label } = resolveGroupKey(rawGroupValue, config, fieldDef, {
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
      const weight = Number(loan.amount);
      if (weight > 0) {
        acc.rateWeighted += measureValue * weight;
        acc.weightSum += weight;
      }
    } else if (config.measure === 'loanCount') {
      acc.sum += measureValue;
    } else {
      acc.sum += measureValue;
    }
  }

  const rawSlices: PieChartSlice[] = [];

  for (const [key, acc] of groups) {
    let value: number;
    switch (config.measureAggregation) {
      case 'count':
        value = acc.count;
        break;
      case 'average':
        if (config.measure === 'interestRateAvg') {
          value = acc.weightSum > 0 ? acc.rateWeighted / acc.weightSum : 0;
        } else if (config.measure === 'loanCount') {
          value = acc.count > 0 ? acc.sum / acc.count : 0;
        } else {
          value = acc.count > 0 ? acc.sum / acc.count : 0;
        }
        break;
      default:
        value = config.measure === 'loanCount' ? acc.sum : acc.sum;
        break;
    }
    if (config.measureAggregation !== 'count' && config.measure !== 'loanCount' && acc.count === 0) {
      continue;
    }
    rawSlices.push({ key, label: acc.label, value });
  }

  rawSlices.sort((a, b) => b.value - a.value);

  const topN = Math.max(1, config.topNCategories);
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
