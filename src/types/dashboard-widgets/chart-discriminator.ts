import type { EntityFilter } from '@/types/entity-filters';

export const CHART_DATE_GROUPINGS = ['year', 'month', 'monthOfYear', 'weekOfYear', 'dayOfWeek'] as const;

export type ChartDateGrouping = (typeof CHART_DATE_GROUPINGS)[number];

export type ChartTextTransform =
  | { kind: 'firstChars'; count: number }
  | { kind: 'lastChars'; count: number }
  | { kind: 'firstWord' }
  | { kind: 'charCount' };

export type ChartGroupBy = {
  entity: 'loan' | 'lender';
  field: string;
};

export type ChartDiscriminatorConfig = {
  groupBy: ChartGroupBy;
  numericBuckets?: number[];
  dateGrouping?: ChartDateGrouping;
  textTransform?: ChartTextTransform;
  topNCategories: number;
  filters: EntityFilter[];
};

export const DEFAULT_CHART_TOP_N = 8;

export function createDefaultChartDiscriminatorConfig(): ChartDiscriminatorConfig {
  return {
    groupBy: { entity: 'loan', field: 'status' },
    topNCategories: DEFAULT_CHART_TOP_N,
    filters: [],
  };
}

export function parseNumericBuckets(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) {
    return undefined;
  }
  const parsed = raw
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const unique: number[] = [];
  for (const n of parsed) {
    if (unique.length === 0 || unique[unique.length - 1] !== n) {
      unique.push(n);
    }
  }
  return unique.length > 0 ? unique : undefined;
}

export function parseChartTextTransform(raw: unknown): ChartTextTransform | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const t = raw as ChartTextTransform;
  if (t.kind === 'firstWord' || t.kind === 'charCount') {
    return { kind: t.kind };
  }
  if (t.kind === 'firstChars' || t.kind === 'lastChars') {
    const count = Number((t as { count?: number }).count);
    if (Number.isFinite(count) && count > 0) {
      return { kind: t.kind, count: Math.floor(count) };
    }
  }
  return undefined;
}

/** Reads flat discriminator fields from widget config JSON (pie legacy layout). */
export function parseChartDiscriminatorConfig(
  raw: Record<string, unknown> | undefined,
  defaults: ChartDiscriminatorConfig = createDefaultChartDiscriminatorConfig(),
): ChartDiscriminatorConfig {
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const nested = raw.discriminator as ChartDiscriminatorConfig | undefined;
  if (nested && typeof nested === 'object' && nested.groupBy) {
    const entity = nested.groupBy.entity === 'lender' ? 'lender' : 'loan';
    const field = typeof nested.groupBy.field === 'string' ? nested.groupBy.field : defaults.groupBy.field;
    const topN = Number(nested.topNCategories);
    return {
      groupBy: { entity, field },
      numericBuckets: parseNumericBuckets(nested.numericBuckets),
      dateGrouping: CHART_DATE_GROUPINGS.includes(nested.dateGrouping as ChartDateGrouping)
        ? (nested.dateGrouping as ChartDateGrouping)
        : undefined,
      textTransform: parseChartTextTransform(nested.textTransform),
      topNCategories: Number.isFinite(topN) && topN >= 1 && topN <= 50 ? Math.floor(topN) : defaults.topNCategories,
      filters: Array.isArray(nested.filters) ? (nested.filters as EntityFilter[]) : [],
    };
  }

  const groupByRaw = raw.groupBy as ChartGroupBy | undefined;
  const entity = groupByRaw?.entity === 'lender' ? 'lender' : 'loan';
  const field = typeof groupByRaw?.field === 'string' ? groupByRaw.field : defaults.groupBy.field;
  const topN = Number(raw.topNCategories);

  return {
    groupBy: { entity, field },
    numericBuckets: parseNumericBuckets(raw.numericBuckets),
    dateGrouping: CHART_DATE_GROUPINGS.includes(raw.dateGrouping as ChartDateGrouping)
      ? (raw.dateGrouping as ChartDateGrouping)
      : undefined,
    textTransform: parseChartTextTransform(raw.textTransform),
    topNCategories: Number.isFinite(topN) && topN >= 1 && topN <= 50 ? Math.floor(topN) : defaults.topNCategories,
    filters: Array.isArray(raw.filters) ? (raw.filters as EntityFilter[]) : [],
  };
}

export function chartDiscriminatorToFlatFields(
  discriminator: ChartDiscriminatorConfig,
): Pick<
  ChartDiscriminatorConfig,
  'groupBy' | 'numericBuckets' | 'dateGrouping' | 'textTransform' | 'topNCategories' | 'filters'
> {
  return {
    groupBy: discriminator.groupBy,
    numericBuckets: discriminator.numericBuckets,
    dateGrouping: discriminator.dateGrouping,
    textTransform: discriminator.textTransform,
    topNCategories: discriminator.topNCategories,
    filters: discriminator.filters,
  };
}
