'use client';

import { useTranslations } from 'next-intl';
import { useMemo, type ReactNode } from 'react';

import {
  FilterFieldGroup,
  FilterStackedFields,
  filterOperatorSegmentClass,
  filterSymbolOperatorLabelClass,
  filterSymbolOperatorTriggerClass,
  filterValueSegmentClass,
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
  type NumberFilterOperatorWithEmpty,
  type NumberFilterValue,
  parseNumberFilterValue,
} from '@/types/number-filter-value';

function hasPayload(operator: NumberFilterOperatorWithEmpty): boolean {
  return operator !== 'empty' && operator !== 'notEmpty';
}

export function NumberFilterWithOperator({
  value,
  onChange,
  allowEmpty = false,
  translationNamespace = 'dataTable',
  variant = 'row',
  size = 'default',
}: {
  value: unknown;
  onChange: (value: NumberFilterValue) => void;
  allowEmpty?: boolean;
  translationNamespace?: string;
  variant?: FilterFieldVariant;
  size?: FilterFieldSize;
}) {
  const t = useTranslations(translationNamespace);
  const parsed = useMemo(() => parseNumberFilterValue(value), [value]);

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
          onChange={(e) => {
            const next = e.target.value === '' ? null : Number(e.target.value);
            onChange({
              operator: 'between',
              min: next,
              max: parsed.max,
            });
          }}
          className={filterValueSegmentClass(size)}
        />
        <Input
          type="number"
          placeholder={t('numberFilterMax')}
          value={parsed.max ?? ''}
          onChange={(e) => {
            const next = e.target.value === '' ? null : Number(e.target.value);
            onChange({
              operator: 'between',
              min: parsed.min,
              max: next,
            });
          }}
          className={filterValueSegmentClass(size)}
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
        onChange={(e) => {
          const next = e.target.value === '' ? null : Number(e.target.value);
          onChange({
            operator: parsed.operator,
            value: next,
          });
        }}
        className={filterValueSegmentClass(size)}
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
