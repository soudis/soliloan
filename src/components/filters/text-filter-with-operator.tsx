'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

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
  createDefaultTextFilterValueForOperator,
  parseTextFilterValue,
  TEXT_FILTER_EMPTY_OPERATORS,
  TEXT_FILTER_OPERATORS,
  type TextFilterOperatorWithEmpty,
  type TextFilterValue,
} from '@/types/text-filter-value';

function hasPayload(operator: TextFilterOperatorWithEmpty): boolean {
  return operator !== 'empty' && operator !== 'notEmpty';
}

export function TextFilterWithOperator({
  value,
  onChange,
  allowEmpty = false,
  translationNamespace = 'dataTable',
  variant = 'row',
  size = 'default',
  placeholder,
}: {
  value: unknown;
  onChange: (value: TextFilterValue) => void;
  allowEmpty?: boolean;
  translationNamespace?: string;
  variant?: FilterFieldVariant;
  size?: FilterFieldSize;
  placeholder?: string;
}) {
  const t = useTranslations(translationNamespace);
  const parsed = useMemo(() => parseTextFilterValue(value), [value]);

  const availableOperators = useMemo(() => {
    const emptyOps = allowEmpty ? [...TEXT_FILTER_EMPTY_OPERATORS] : [];
    return [...TEXT_FILTER_OPERATORS, ...emptyOps];
  }, [allowEmpty]);

  const setOperator = (operator: TextFilterOperatorWithEmpty) => {
    if (operator === parsed.operator) {
      return;
    }
    onChange(createDefaultTextFilterValueForOperator(operator));
  };

  const showPayload = hasPayload(parsed.operator);
  const useStackedLayout = variant === 'stacked' && showPayload;

  const operatorSelect = (
    <Select value={parsed.operator} onValueChange={(op) => setOperator(op as TextFilterOperatorWithEmpty)}>
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
              {t(`textFilterOperators.${operator}`)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const payload =
    showPayload &&
    (parsed.operator === 'contains' ||
      parsed.operator === 'startsWith' ||
      parsed.operator === 'endsWith' ||
      parsed.operator === 'eq') ? (
      <Input
        placeholder={placeholder ?? t('textFilterValue')}
        value={parsed.value}
        onChange={(e) =>
          onChange({
            operator: parsed.operator,
            value: e.target.value,
          })
        }
        className={filterValueSegmentClass(size)}
      />
    ) : null;

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
