'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, type ReactNode } from 'react';

import {
  FilterFieldGroup,
  FilterStackedFields,
  filterOperatorSegmentClass,
  filterValueSegmentClass,
  type FilterFieldSize,
  type FilterFieldVariant,
} from '@/components/filters/filter-field-group';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  createDefaultEnumFilterValueForOperator,
  ENUM_FILTER_EMPTY_OPERATORS,
  ENUM_FILTER_OPERATORS,
  type EnumFilterOperator,
  type EnumFilterOperatorWithEmpty,
  type EnumFilterValue,
  parseEnumFilterValue,
} from '@/types/enum-filter-value';

function hasPayload(operator: EnumFilterOperatorWithEmpty): boolean {
  return operator !== 'empty' && operator !== 'notEmpty';
}

export function EnumFilterWithOperator({
  value,
  onChange,
  options,
  allowEmpty = false,
  defaultOperator = 'eq',
  translationNamespace = 'dataTable',
  variant = 'row',
  size = 'default',
}: {
  value: unknown;
  onChange: (value: EnumFilterValue) => void;
  options: { label: string; value: string }[];
  allowEmpty?: boolean;
  defaultOperator?: EnumFilterOperator;
  translationNamespace?: string;
  variant?: FilterFieldVariant;
  size?: FilterFieldSize;
}) {
  const t = useTranslations(translationNamespace);
  const tCommon = useTranslations('common.ui');
  const parsed = useMemo(() => parseEnumFilterValue(value, defaultOperator), [value, defaultOperator]);

  const availableOperators = useMemo(() => {
    const emptyOps = allowEmpty ? [...ENUM_FILTER_EMPTY_OPERATORS] : [];
    return [...ENUM_FILTER_OPERATORS, ...emptyOps];
  }, [allowEmpty]);

  const setOperator = (operator: EnumFilterOperatorWithEmpty) => {
    if (operator === parsed.operator) {
      return;
    }
    onChange(createDefaultEnumFilterValueForOperator(operator));
  };

  const showPayload = hasPayload(parsed.operator);
  const useStackedLayout = variant === 'stacked' && showPayload;

  const operatorSelect = (
    <Select
      value={parsed.operator}
      onValueChange={(op) => setOperator(op as EnumFilterOperatorWithEmpty)}
    >
      <SelectTrigger className={filterOperatorSegmentClass(size, useStackedLayout)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {availableOperators.map((operator) => (
          <SelectItem key={operator} value={operator} className={size === 'sm' ? 'text-xs' : undefined}>
            {t(`enumFilterOperators.${operator}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  let payload: ReactNode = null;
  if (parsed.operator === 'eq') {
    payload = (
      <select
        className={cn(
          filterValueSegmentClass(size),
          'rounded-md border border-border bg-background px-3 py-1',
        )}
        value={parsed.value}
        onChange={(e) =>
          onChange({
            operator: 'eq',
            value: e.target.value,
          })
        }
      >
        <option value="">{tCommon('table.all')}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else if (parsed.operator === 'in') {
    const selected = parsed.values;
    payload = (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(filterValueSegmentClass(size), 'justify-between font-normal shadow-none')}
          >
            <span className="truncate">
              {selected.length === 0
                ? tCommon('form.selectPlaceholder')
                : selected.length === 1
                  ? options.find((o) => o.value === selected[0])?.label
                  : t('enumFilterSelectedCount', { count: selected.length })}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className={cn('w-[--radix-dropdown-menu-trigger-width]', size === 'sm' && 'text-xs')}
        >
          {options.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={checked}
                onCheckedChange={(nextChecked) => {
                  const next =
                    nextChecked === true
                      ? [...selected, option.value]
                      : selected.filter((v) => v !== option.value);
                  onChange({ operator: 'in', values: next });
                }}
                onSelect={(e) => e.preventDefault()}
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
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
