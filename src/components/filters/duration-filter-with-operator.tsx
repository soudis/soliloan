'use client';

import { useTranslations } from 'next-intl';
import { useMemo, type KeyboardEvent, type ReactNode } from 'react';

import {
  FilterFieldGroup,
  FilterStackedFields,
  filterNumberValueSegmentClass,
  filterOperatorSegmentClass,
  filterSymbolOperatorLabelClass,
  filterSymbolOperatorTriggerClass,
  type FilterFieldSize,
  type FilterFieldVariant,
} from '@/components/filters/filter-field-group';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  createDefaultDurationFilterValueForOperator,
  DURATION_FILTER_EMPTY_OPERATORS,
  DURATION_FILTER_OPERATORS,
  DURATION_FILTER_TERMINATION_OPERATORS,
  DURATION_FILTER_UNITS,
  type DurationFilterOperator,
  type DurationFilterOperatorWithEmpty,
  type DurationFilterUnit,
  type DurationFilterValue,
  parseDurationFilterValue,
} from '@/types/duration-filter-value';

const DURATION_OPERATOR_SHORTCUTS: Record<string, 'eq' | 'gt' | 'lt'> = {
  '=': 'eq',
  '>': 'gt',
  '<': 'lt',
};

function hasPayload(operator: DurationFilterOperatorWithEmpty): boolean {
  return operator !== 'empty' && operator !== 'notEmpty' && operator !== 'termination';
}

export function DurationFilterWithOperator({
  value,
  onChange,
  allowEmpty = false,
  terminationValue = false,
  defaultOperator = 'between',
  translationNamespace = 'dataTable',
  variant = 'row',
  size = 'default',
}: {
  value: unknown;
  onChange: (value: DurationFilterValue) => void;
  allowEmpty?: boolean;
  terminationValue?: boolean;
  defaultOperator?: DurationFilterOperator;
  translationNamespace?: string;
  variant?: FilterFieldVariant;
  size?: FilterFieldSize;
}) {
  const t = useTranslations(translationNamespace);
  const parsed = useMemo(() => parseDurationFilterValue(value, defaultOperator), [value, defaultOperator]);

  const availableOperators = useMemo(() => {
    const emptyOps = allowEmpty ? [...DURATION_FILTER_EMPTY_OPERATORS] : [];
    const terminationOps = terminationValue ? [...DURATION_FILTER_TERMINATION_OPERATORS] : [];
    return [...DURATION_FILTER_OPERATORS, ...emptyOps, ...terminationOps];
  }, [allowEmpty, terminationValue]);

  const setOperator = (operator: DurationFilterOperatorWithEmpty) => {
    if (operator === parsed.operator) {
      return;
    }
    onChange(createDefaultDurationFilterValueForOperator(operator));
  };

  const currentUnit: DurationFilterUnit =
    parsed.operator === 'between' ||
    parsed.operator === 'eq' ||
    parsed.operator === 'gt' ||
    parsed.operator === 'lt' ||
    parsed.operator === 'gte' ||
    parsed.operator === 'lte'
      ? parsed.unit
      : 'years';

  const handleOperatorShortcut = (event: KeyboardEvent<HTMLInputElement>, fieldValue: number | null) => {
    const operator = DURATION_OPERATOR_SHORTCUTS[event.key];
    if (!operator) {
      return;
    }
    event.preventDefault();
    if (parsed.operator === operator) {
      return;
    }
    onChange({ operator, amount: fieldValue, unit: currentUnit });
  };

  const unitSelect = (
    <Select
      value={currentUnit}
      onValueChange={(unit) => {
        const nextUnit = unit as DurationFilterUnit;
        if (parsed.operator === 'between') {
          onChange({ operator: 'between', min: parsed.min, max: parsed.max, unit: nextUnit });
          return;
        }
        if (
          parsed.operator === 'eq' ||
          parsed.operator === 'gt' ||
          parsed.operator === 'lt' ||
          parsed.operator === 'gte' ||
          parsed.operator === 'lte'
        ) {
          onChange({ operator: parsed.operator, amount: parsed.amount, unit: nextUnit });
        }
      }}
    >
      <SelectTrigger className={cn(filterOperatorSegmentClass(size, false), size === 'sm' ? 'text-xs' : undefined)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DURATION_FILTER_UNITS.map((unit) => (
          <SelectItem key={unit} value={unit} className={size === 'sm' ? 'text-xs' : undefined}>
            {t(`durationFilterUnits.${unit}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const showPayload = hasPayload(parsed.operator);
  const useStackedLayout = variant === 'stacked' && showPayload;

  const operatorSelect = (
    <Select value={parsed.operator} onValueChange={(op) => setOperator(op as DurationFilterOperatorWithEmpty)}>
      <SelectTrigger
        className={cn(
          filterOperatorSegmentClass(size, useStackedLayout),
          filterSymbolOperatorTriggerClass(parsed.operator, size),
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {availableOperators.map((operator) => (
          <SelectItem key={operator} value={operator} className={size === 'sm' ? 'text-xs' : undefined}>
            <span className={filterSymbolOperatorLabelClass(operator, size)}>
              {t(`durationFilterOperators.${operator}`)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  let payload: ReactNode = null;
  if (parsed.operator === 'between') {
    payload = (
      <>
        <Input
          type="number"
          placeholder={t('numberFilterMin')}
          value={parsed.min ?? ''}
          onKeyDown={(e) => handleOperatorShortcut(e, parsed.min)}
          onChange={(e) => {
            const next = e.target.value === '' ? null : Number(e.target.value);
            onChange({
              operator: 'between',
              min: next,
              max: parsed.max,
              unit: parsed.unit,
            });
          }}
          className={filterNumberValueSegmentClass(size)}
        />
        <Input
          type="number"
          placeholder={t('numberFilterMax')}
          value={parsed.max ?? ''}
          onKeyDown={(e) => handleOperatorShortcut(e, parsed.max)}
          onChange={(e) => {
            const next = e.target.value === '' ? null : Number(e.target.value);
            onChange({
              operator: 'between',
              min: parsed.min,
              max: next,
              unit: parsed.unit,
            });
          }}
          className={filterNumberValueSegmentClass(size)}
        />
        {unitSelect}
      </>
    );
  } else if (
    parsed.operator === 'eq' ||
    parsed.operator === 'gt' ||
    parsed.operator === 'lt' ||
    parsed.operator === 'gte' ||
    parsed.operator === 'lte'
  ) {
    payload = (
      <>
        <Input
          type="number"
          placeholder={t('numberFilterValue')}
          value={parsed.amount ?? ''}
          onKeyDown={(e) => handleOperatorShortcut(e, parsed.amount)}
          onChange={(e) => {
            const next = e.target.value === '' ? null : Number(e.target.value);
            onChange({
              operator: parsed.operator,
              amount: next,
              unit: parsed.unit,
            });
          }}
          className={filterNumberValueSegmentClass(size)}
        />
        {unitSelect}
      </>
    );
  }

  if (useStackedLayout) {
    return <FilterStackedFields operator={operatorSelect} payload={payload} />;
  }

  return (
    <FilterFieldGroup>
      {operatorSelect}
      {payload}
    </FilterFieldGroup>
  );
}
