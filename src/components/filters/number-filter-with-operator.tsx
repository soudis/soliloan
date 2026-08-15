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
  createDefaultNumberFilterValueForOperator,
  NUMBER_FILTER_EMPTY_OPERATORS,
  NUMBER_FILTER_OPERATORS,
  type NumberFilterOperator,
  type NumberFilterOperatorWithEmpty,
  type NumberFilterValue,
  parseNumberFilterValue,
} from '@/types/number-filter-value';

const NUMBER_OPERATOR_SHORTCUTS: Record<string, 'eq' | 'gt' | 'lt'> = {
  '=': 'eq',
  '>': 'gt',
  '<': 'lt',
};

function hasPayload(operator: NumberFilterOperatorWithEmpty): boolean {
  return operator !== 'empty' && operator !== 'notEmpty';
}

export function NumberFilterWithOperator({
  value,
  onChange,
  allowEmpty = false,
  defaultOperator = 'between',
  translationNamespace = 'dataTable',
  variant = 'row',
  size = 'default',
}: {
  value: unknown;
  onChange: (value: NumberFilterValue) => void;
  allowEmpty?: boolean;
  defaultOperator?: NumberFilterOperator;
  translationNamespace?: string;
  variant?: FilterFieldVariant;
  size?: FilterFieldSize;
}) {
  const t = useTranslations(translationNamespace);
  const parsed = useMemo(
    () => parseNumberFilterValue(value, defaultOperator),
    [value, defaultOperator],
  );

  const availableOperators = useMemo(() => {
    const emptyOps = allowEmpty ? [...NUMBER_FILTER_EMPTY_OPERATORS] : [];
    return [...NUMBER_FILTER_OPERATORS, ...emptyOps];
  }, [allowEmpty]);

  const setOperator = (operator: NumberFilterOperatorWithEmpty) => {
    if (operator === parsed.operator) {
      return;
    }
    onChange(createDefaultNumberFilterValueForOperator(operator));
  };

  const handleOperatorShortcut = (
    event: KeyboardEvent<HTMLInputElement>,
    fieldValue: number | null,
  ) => {
    const operator = NUMBER_OPERATOR_SHORTCUTS[event.key];
    if (!operator) {
      return;
    }
    event.preventDefault();
    if (parsed.operator === operator) {
      return;
    }
    onChange({ operator, value: fieldValue });
  };

  const showPayload = hasPayload(parsed.operator);
  const useStackedLayout = variant === 'stacked' && showPayload;

  const operatorSelect = (
    <Select
      value={parsed.operator}
      onValueChange={(op) => setOperator(op as NumberFilterOperatorWithEmpty)}
    >
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
              {t(`numberFilterOperators.${operator}`)}
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
            });
          }}
          className={filterNumberValueSegmentClass(size)}
        />
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
      <Input
        type="number"
        placeholder={t('numberFilterValue')}
        value={parsed.value ?? ''}
        onKeyDown={(e) => handleOperatorShortcut(e, parsed.value)}
        onChange={(e) => {
          const next = e.target.value === '' ? null : Number(e.target.value);
          onChange({
            operator: parsed.operator,
            value: next,
          });
        }}
        className={filterNumberValueSegmentClass(size)}
      />
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
