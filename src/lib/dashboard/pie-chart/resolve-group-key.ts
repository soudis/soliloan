import moment from 'moment';

import type { DataTableColumnFilterDefinition } from '@/lib/entity-filters/filter-definitions';
import { formatCurrency, formatNumber } from '@/lib/utils';
import type {
  PieChartDateGrouping,
  PieChartTextTransform,
  PieChartWidgetConfig,
} from '@/types/dashboard-widgets/pie-chart';

export const PIE_EMPTY_GROUP_KEY = '__empty__';

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

export function formatNumericBucketLabel(
  thresholds: number[],
  bucketIndex: number,
  field: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (bucketIndex === 0) {
    return t('numericBucketUpTo', { max: formatNumericValue(thresholds[0], field) });
  }
  if (bucketIndex < thresholds.length) {
    const prev = thresholds[bucketIndex - 1];
    const max = thresholds[bucketIndex];
    return t('numericBucketRange', {
      min: formatNumericValue(prev + (CURRENCY_GROUP_FIELDS.has(field) ? 0.01 : 1), field),
      max: formatNumericValue(max, field),
    });
  }
  const last = thresholds[thresholds.length - 1];
  return t('numericBucketAbove', { min: formatNumericValue(last, field) });
}

function getNumericBucketIndex(value: number, thresholds: number[]): number {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) {
      return i;
    }
  }
  return thresholds.length;
}

function applyTextTransform(text: string, transform: PieChartTextTransform): string {
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

function resolveDateGroupKey(date: Date, grouping: PieChartDateGrouping, locale: string): GroupKeyResult {
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
  return str;
}

export function resolveGroupKey(
  rawValue: unknown,
  config: PieChartWidgetConfig,
  fieldDefinition: DataTableColumnFilterDefinition | undefined,
  formatters: {
    emptyLabel: string;
    locale: string;
    commonT: (key: string, values?: Record<string, string>) => string;
    t: (key: string, values?: Record<string, string | number>) => string;
  },
): GroupKeyResult {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return { key: PIE_EMPTY_GROUP_KEY, label: formatters.emptyLabel };
  }

  const field = config.groupBy.field;

  if (fieldDefinition?.type === 'number' && config.numericBuckets?.length) {
    const num = Number(rawValue);
    if (!Number.isFinite(num)) {
      return { key: PIE_EMPTY_GROUP_KEY, label: formatters.emptyLabel };
    }
    const index = getNumericBucketIndex(num, config.numericBuckets);
    const key = `bucket:${index}`;
    const label = formatNumericBucketLabel(config.numericBuckets, index, field, formatters.t);
    return { key, label };
  }

  if (fieldDefinition?.type === 'date') {
    const date = rawValue instanceof Date ? rawValue : new Date(String(rawValue));
    if (Number.isNaN(date.getTime())) {
      return { key: PIE_EMPTY_GROUP_KEY, label: formatters.emptyLabel };
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
      return { key: PIE_EMPTY_GROUP_KEY, label: formatters.emptyLabel };
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
