import { TerminationType } from '@prisma/client';
import moment from 'moment';

import { isTotalRuntime } from '@/lib/calculations/loan-duration-metrics';
import { isCalendarSpan } from '@/lib/calendar-span';
import type { DataTableColumnFilterDefinition } from '@/lib/entity-filters/filter-definitions';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type {
  ChartDateGrouping,
  ChartDiscriminatorConfig,
  ChartDurationGrouping,
  ChartTextTransform,
} from '@/types/dashboard-widgets/chart-discriminator';

export const CHART_EMPTY_GROUP_KEY = '__empty__';
export const CHART_TERMINATION_GROUP_KEY = 'termination:TERMINATION';

/** Numeric order for duration and limit buckets. Labels such as "über 10 Jahre" are not used. */
export function groupSortRank(key: string): number | null {
  const durationBucket = /^duration:[^:]+:bucket:(\d+)$/.exec(key);
  if (durationBucket?.[1]) {
    return Number(durationBucket[1]);
  }
  const durationValue = /^duration:[^:]+:(\d+)$/.exec(key);
  if (durationValue?.[1]) {
    return Number(durationValue[1]);
  }
  const numericBucket = /^bucket:(\d+)$/.exec(key);
  if (numericBucket?.[1]) {
    return Number(numericBucket[1]);
  }
  return null;
}

/** @deprecated Use CHART_EMPTY_GROUP_KEY */
export const PIE_EMPTY_GROUP_KEY = CHART_EMPTY_GROUP_KEY;

export type GroupKeyResult = {
  key: string;
  label: string;
};

const CURRENCY_GROUP_FIELDS = new Set([
  'amount',
  'balance',
  'deposits',
  'withdrawals',
  'notReclaimed',
  'interest',
  'interestPaid',
  'interestError',
]);

function formatNumericValue(value: number, field: string): string {
  if (CURRENCY_GROUP_FIELDS.has(field)) {
    return formatCurrency(value);
  }
  return formatNumber(value, 0, 2);
}

function formatThresholdBucketLabel(
  thresholds: number[],
  bucketIndex: number,
  t: (key: string, values?: Record<string, string | number>) => string,
  formatBound: (value: number) => string,
  formatRangeMin: (previous: number) => string,
): string {
  if (bucketIndex === 0) {
    return t('numericBucketUpTo', { max: formatBound(thresholds[0] ?? 0) });
  }
  if (bucketIndex < thresholds.length) {
    const previous = thresholds[bucketIndex - 1] ?? 0;
    const max = thresholds[bucketIndex] ?? previous;
    return t('numericBucketRange', {
      min: formatRangeMin(previous),
      max: formatBound(max),
    });
  }
  const last = thresholds[thresholds.length - 1] ?? 0;
  return t('numericBucketAbove', { min: formatBound(last) });
}

export function formatNumericBucketLabel(
  thresholds: number[],
  bucketIndex: number,
  field: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  const step = CURRENCY_GROUP_FIELDS.has(field) ? 0.01 : 1;
  return formatThresholdBucketLabel(
    thresholds,
    bucketIndex,
    t,
    (value) => formatNumericValue(value, field),
    (previous) => formatNumericValue(previous + step, field),
  );
}

function durationGroupCount(
  value: { totalDays: number; years: number | null; months: number | null },
  grouping: ChartDurationGrouping,
): number | null {
  if (grouping === 'years') {
    return value.years;
  }
  if (grouping === 'months') {
    return value.months;
  }
  return value.totalDays;
}

function formatDurationGroupLabel(
  commonT: (key: string, values?: Record<string, string>) => string,
  grouping: ChartDurationGrouping,
  count: number,
): string {
  const translate = commonT as (key: string, values?: Record<string, number>) => string;
  return translate(`duration.${grouping}`, { count });
}

function formatDurationBucketLabel(
  thresholds: number[],
  bucketIndex: number,
  grouping: ChartDurationGrouping,
  commonT: (key: string, values?: Record<string, string>) => string,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  const unit = (count: number) => formatDurationGroupLabel(commonT, grouping, count);
  return formatThresholdBucketLabel(thresholds, bucketIndex, t, unit, (previous) => unit(previous + 1));
}

function getNumericBucketIndex(value: number, thresholds: number[]): number {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) {
      return i;
    }
  }
  return thresholds.length;
}

function applyTextTransform(text: string, transform: ChartTextTransform): string {
  switch (transform.kind) {
    case 'firstChars':
      return text.slice(0, transform.count);
    case 'lastChars':
      return text.slice(-transform.count);
    case 'firstWord':
      return text.trim().split(/\s+/)[0] ?? '';
    case 'charCount':
      return String(text.length);
    default:
      return text;
  }
}

function resolveDateGroupKey(date: Date, grouping: ChartDateGrouping, locale: string): GroupKeyResult {
  const m = moment(date).locale(locale);
  switch (grouping) {
    case 'year':
      return { key: `year:${m.year()}`, label: String(m.year()) };
    case 'month':
      return { key: `month:${m.format('YYYY-MM')}`, label: m.format('MMM YYYY') };
    case 'monthOfYear':
      return { key: `monthOfYear:${m.month()}`, label: m.format('MMMM') };
    case 'weekOfYear':
      return { key: `week:${m.isoWeekYear()}-W${m.isoWeek()}`, label: `KW ${m.isoWeek()}` };
    case 'dayOfWeek':
      return { key: `dow:${m.day()}`, label: m.format('dddd') };
    default:
      return { key: `date:${m.format('YYYY-MM-DD')}`, label: m.format('L') };
  }
}

function resolveSelectLabel(
  rawValue: unknown,
  definition: DataTableColumnFilterDefinition | undefined,
  commonT: (key: string, values?: Record<string, string>) => string,
  field: string,
): string {
  const str = rawValue === null || rawValue === undefined ? '' : String(rawValue);
  if (definition?.options) {
    const match = definition.options.find((o) => o.value === str);
    if (match) {
      return match.label;
    }
  }
  if (field === 'status') {
    return commonT(`enums.loan.status.${str}`);
  }
  if (field === 'type' && str) {
    return commonT(`enums.lender.type.${str}`);
  }
  if (field === 'altInterestMethod' && str) {
    return commonT(`enums.interestMethod.${str}`);
  }
  if (field === 'contractStatus' && str) {
    return commonT(`enums.loan.contractStatus.${str}`);
  }
  if (field === 'terminationType' && str) {
    return commonT(`enums.loan.terminationType.${str}`);
  }
  if (field === 'salutation' && str) {
    return commonT(`enums.lender.salutation.${str}`);
  }
  if (field === 'notificationType' && str) {
    return commonT(`enums.lender.notificationType.${str}`);
  }
  if (field === 'country' && str) {
    return commonT(`countries.${str.toLowerCase()}`);
  }
  return str;
}

export function resolveGroupKey(
  rawValue: unknown,
  config: ChartDiscriminatorConfig,
  fieldDefinition: DataTableColumnFilterDefinition | undefined,
  formatters: {
    emptyLabel: string;
    locale: string;
    commonT: (key: string, values?: Record<string, string>) => string;
    t: (key: string, values?: Record<string, string | number>) => string;
  },
): GroupKeyResult {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return { key: CHART_EMPTY_GROUP_KEY, label: formatters.emptyLabel };
  }

  const field = config.groupBy.field;

  if (fieldDefinition?.type === 'duration') {
    let units: { totalDays: number; years: number | null; months: number | null } | null = null;
    if (isTotalRuntime(rawValue)) {
      if (rawValue.terminationType === TerminationType.TERMINATION) {
        return {
          key: CHART_TERMINATION_GROUP_KEY,
          label: formatters.commonT('duration.byTermination'),
        };
      }
      if (rawValue.days == null || !Number.isFinite(rawValue.days) || rawValue.days < 0) {
        return { key: CHART_EMPTY_GROUP_KEY, label: formatters.emptyLabel };
      }
      units = {
        totalDays: rawValue.days,
        years: rawValue.years ?? null,
        months: rawValue.months ?? null,
      };
    } else if (isCalendarSpan(rawValue)) {
      units = rawValue;
    } else {
      const num = Number(rawValue);
      if (!Number.isFinite(num) || num < 0) {
        return { key: CHART_EMPTY_GROUP_KEY, label: formatters.emptyLabel };
      }
      units = { totalDays: num, years: null, months: null };
    }
    const grouping = config.durationGrouping ?? 'years';
    const count = durationGroupCount(units, grouping);
    if (count == null) {
      return { key: CHART_EMPTY_GROUP_KEY, label: formatters.emptyLabel };
    }
    if (config.numericBuckets?.length) {
      const index = getNumericBucketIndex(count, config.numericBuckets);
      return {
        key: `duration:${grouping}:bucket:${index}`,
        label: formatDurationBucketLabel(config.numericBuckets, index, grouping, formatters.commonT, formatters.t),
      };
    }
    return {
      key: `duration:${grouping}:${count}`,
      label: formatDurationGroupLabel(formatters.commonT, grouping, count),
    };
  }

  if (fieldDefinition?.type === 'number' && config.numericBuckets?.length) {
    const num = Number(rawValue);
    if (!Number.isFinite(num)) {
      return { key: CHART_EMPTY_GROUP_KEY, label: formatters.emptyLabel };
    }
    const index = getNumericBucketIndex(num, config.numericBuckets);
    const key = `bucket:${index}`;
    const label = formatNumericBucketLabel(config.numericBuckets, index, field, formatters.t);
    return { key, label };
  }

  if (fieldDefinition?.type === 'date') {
    const date = rawValue instanceof Date ? rawValue : new Date(String(rawValue));
    if (Number.isNaN(date.getTime())) {
      return { key: CHART_EMPTY_GROUP_KEY, label: formatters.emptyLabel };
    }
    const grouping = config.dateGrouping ?? 'year';
    return resolveDateGroupKey(date, grouping, formatters.locale);
  }

  if (fieldDefinition?.type === 'text' && config.textTransform) {
    const text = String(rawValue);
    const transformed = applyTextTransform(text, config.textTransform);
    const display =
      config.textTransform.kind === 'charCount'
        ? formatters.t('charCountLabel', { count: transformed })
        : transformed || formatters.emptyLabel;
    return { key: `text:${transformed}`, label: display };
  }

  if (fieldDefinition?.type === 'number') {
    const num = Number(rawValue);
    if (!Number.isFinite(num)) {
      return { key: CHART_EMPTY_GROUP_KEY, label: formatters.emptyLabel };
    }
    const label = formatNumericValue(num, field);
    return { key: `num:${num}`, label };
  }

  if (fieldDefinition?.type === 'select' || fieldDefinition?.type === 'multi-select') {
    const label = resolveSelectLabel(rawValue, fieldDefinition, formatters.commonT, field);
    const key = `sel:${String(rawValue)}`;
    return { key, label: label || formatters.emptyLabel };
  }

  const str = String(rawValue);
  return { key: `raw:${str}`, label: str || formatters.emptyLabel };
}
