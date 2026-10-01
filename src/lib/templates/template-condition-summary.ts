import { parseTemplateCondition, type TemplateConditionRule } from '@/lib/templates/template-condition';
import type { TemplateConditionField } from '@/lib/templates/template-condition-fields';
import { parseBooleanFilterValue } from '@/types/boolean-filter-value';
import { parseDateFilterValue } from '@/types/date-filter-value';
import { parseEnumFilterValue } from '@/types/enum-filter-value';
import { parseNumberFilterValue } from '@/types/number-filter-value';
import { parseTextFilterValue } from '@/types/text-filter-value';

export type ConditionSummaryLabels = {
  join: string;
  yes: string;
  no: string;
  operators: {
    number: Record<string, string>;
    text: Record<string, string>;
    enum: Record<string, string>;
    date: Record<string, string>;
  };
  between: (start: string, end: string) => string;
  from: (value: string) => string;
  until: (value: string) => string;
  duration: (count: number, unit: 'days' | 'months') => string;
  relative: {
    last: (span: string) => string;
    next: (span: string) => string;
    olderThan: (span: string) => string;
    newerThan: (span: string) => string;
  };
};

const numberFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });

function formatNumberValue(value: number): string {
  return numberFormat.format(value);
}

function formatIsoDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return `${match[3]}.${match[2]}.${match[1]}`;
  return value;
}

function optionLabel(field: TemplateConditionField | undefined, value: string): string {
  return field?.options?.find((option) => option.value === value)?.label ?? value;
}

function joinBounds(label: string, start: string | null, end: string | null, labels: ConditionSummaryLabels): string {
  if (start && end) return `${label} ${labels.between(start, end)}`;
  if (start) return `${label} ${labels.from(start)}`;
  if (end) return `${label} ${labels.until(end)}`;
  return label;
}

function formatNumberRule(label: string, value: unknown, labels: ConditionSummaryLabels): string {
  const parsed = parseNumberFilterValue(value);
  const operator = labels.operators.number[parsed.operator] ?? parsed.operator;
  switch (parsed.operator) {
    case 'empty':
    case 'notEmpty':
      return `${label} ${operator}`;
    case 'between':
      return joinBounds(
        label,
        parsed.min == null ? null : formatNumberValue(parsed.min),
        parsed.max == null ? null : formatNumberValue(parsed.max),
        labels,
      );
    default:
      if (parsed.value == null) return label;
      return `${label} ${operator} ${formatNumberValue(parsed.value)}`;
  }
}

function formatTextRule(label: string, value: unknown, labels: ConditionSummaryLabels): string {
  const parsed = parseTextFilterValue(value);
  const operator = labels.operators.text[parsed.operator] ?? parsed.operator;
  switch (parsed.operator) {
    case 'empty':
    case 'notEmpty':
      return `${label} ${operator}`;
    default:
      if (parsed.value.trim() === '') return label;
      return `${label} ${operator} ${parsed.value.trim()}`;
  }
}

function formatEnumRule(
  label: string,
  value: unknown,
  field: TemplateConditionField | undefined,
  labels: ConditionSummaryLabels,
  defaultOperator: 'eq' | 'in',
): string {
  const parsed = parseEnumFilterValue(value, defaultOperator);
  const operator = labels.operators.enum[parsed.operator] ?? parsed.operator;
  switch (parsed.operator) {
    case 'empty':
    case 'notEmpty':
      return `${label} ${operator}`;
    case 'eq':
      if (parsed.value === '') return label;
      return `${label} ${operator} ${optionLabel(field, parsed.value)}`;
    case 'in': {
      if (parsed.values.length === 0) return label;
      const values = parsed.values.map((item) => optionLabel(field, item)).join(', ');
      return `${label} ${operator} ${values}`;
    }
  }
}

function formatDateRule(label: string, value: unknown, labels: ConditionSummaryLabels): string {
  const parsed = parseDateFilterValue(value);
  const operator = labels.operators.date[parsed.operator] ?? parsed.operator;
  switch (parsed.operator) {
    case 'empty':
    case 'notEmpty':
    case 'thisMonth':
    case 'lastMonth':
    case 'thisYear':
    case 'lastYear':
      return `${label} ${operator}`;
    case 'year':
      return `${label} ${parsed.year}`;
    case 'between':
      return joinBounds(
        label,
        parsed.start ? formatIsoDate(parsed.start) : null,
        parsed.end ? formatIsoDate(parsed.end) : null,
        labels,
      );
    case 'last':
    case 'next':
    case 'olderThan':
    case 'newerThan': {
      if (parsed.amount == null) return label;
      const span = labels.duration(parsed.amount, parsed.unit);
      return `${label} ${labels.relative[parsed.operator](span)}`;
    }
  }
}

function formatBooleanRule(label: string, value: unknown, labels: ConditionSummaryLabels): string {
  const parsed = parseBooleanFilterValue(value);
  if (parsed === '') return label;
  return `${label} = ${parsed === 'true' ? labels.yes : labels.no}`;
}

function formatRule(
  rule: TemplateConditionRule,
  field: TemplateConditionField | undefined,
  labels: ConditionSummaryLabels,
): string {
  const label = field?.label ?? rule.field;
  switch (rule.type) {
    case 'number':
      return formatNumberRule(label, rule.value, labels);
    case 'text':
      return formatTextRule(label, rule.value, labels);
    case 'select':
      return formatEnumRule(label, rule.value, field, labels, 'eq');
    case 'multi-select':
      return formatEnumRule(label, rule.value, field, labels, 'in');
    case 'date':
      return formatDateRule(label, rule.value, labels);
    case 'boolean':
      return formatBooleanRule(label, rule.value, labels);
  }
}

/** Human wording for an AND list of rules, without the leading "Wenn". */
export function formatTemplateConditionSummary(
  raw: unknown,
  fields: readonly TemplateConditionField[],
  labels: ConditionSummaryLabels,
): string {
  const byField = new Map(fields.map((field) => [field.field, field]));
  return parseTemplateCondition(raw)
    .map((rule) => formatRule(rule, byField.get(rule.field), labels))
    .filter((part) => part.length > 0)
    .join(` ${labels.join} `);
}
