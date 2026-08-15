'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { FilterDateSegment } from '@/components/filters/filter-date-segment';
import {
  FilterFieldGroup,
  FilterStackedFields,
  filterInputSegmentClass,
  filterOperatorSegmentClass,
  filterUnitSegmentClass,
  type FilterFieldSize,
  type FilterFieldVariant,
} from '@/components/filters/filter-field-group';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { StatDeltaUnit } from '@/types/dashboard-widgets/stat-widget';
import {
  createDefaultDateFilterValueForOperator,
  DATE_FILTER_EMPTY_OPERATORS,
  DATE_FILTER_LAST_UNITS,
  DATE_FILTER_LEGACY_OPERATORS,
  DATE_FILTER_OPERATORS,
  type DateFilterLastUnit,
  type DateFilterOperatorWithLegacy,
  type DateFilterRelativeAmountValue,
  type DateFilterValue,
  parseDateFilterValue,
} from '@/types/date-filter-value';

function OperatorSelect({
  value,
  onChange,
  availableOperators,
  operatorLabel,
  size,
  fullWidth = false,
}: {
  value: DateFilterOperatorWithLegacy;
  onChange: (operator: DateFilterOperatorWithLegacy) => void;
  availableOperators: DateFilterOperatorWithLegacy[];
  operatorLabel: (operator: DateFilterOperatorWithLegacy) => string;
  size: FilterFieldSize;
  fullWidth?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(op) => onChange(op as DateFilterOperatorWithLegacy)}>
      <SelectTrigger className={filterOperatorSegmentClass(size, fullWidth)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {availableOperators.map((operator) => (
          <SelectItem key={operator} value={operator} className={size === 'sm' ? 'text-xs' : undefined}>
            {operatorLabel(operator)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function RelativeDateAmountFields({
  value,
  onChange,
  size,
  unitOptions,
}: {
  value: DateFilterRelativeAmountValue;
  onChange: (value: DateFilterRelativeAmountValue) => void;
  size: FilterFieldSize;
  unitOptions: { value: StatDeltaUnit; label: string }[];
}) {
  return (
    <>
      <Input
        type="number"
        step={1}
        value={value.amount ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onChange({ amount: null, unit: value.unit });
            return;
          }
          const parsed = Number.parseInt(raw, 10);
          onChange({
            amount: Number.isFinite(parsed) ? parsed : null,
            unit: value.unit,
          });
        }}
        className={filterInputSegmentClass(size, 'amount')}
      />
      <Select
        value={value.unit}
        onValueChange={(unit) =>
          onChange({
            amount: value.amount,
            unit: unit as DateFilterLastUnit,
          })
        }
      >
        <SelectTrigger className={filterUnitSegmentClass(size)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {unitOptions.map((option) => (
            <SelectItem key={option.value} value={option.value} className={size === 'sm' ? 'text-xs' : undefined}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}

function DateFilterPayload({
  parsed,
  onChange,
  variant,
  size,
  refDate,
  t,
  unitOptions,
}: {
  parsed: DateFilterValue;
  onChange: (value: DateFilterValue) => void;
  variant: FilterFieldVariant;
  size: FilterFieldSize;
  refDate: Date;
  t: ReturnType<typeof useTranslations>;
  unitOptions: { value: StatDeltaUnit; label: string }[];
}) {
  switch (parsed.operator) {
    case 'between':
      return (
        <>
          <FilterDateSegment
            label={t('dateFilterStart')}
            value={parsed.start}
            variant={variant}
            size={size}
            onChange={(start) =>
              onChange({
                operator: 'between',
                start: start ?? null,
                end: parsed.end,
              })
            }
            onClear={() =>
              onChange({
                operator: 'between',
                start: null,
                end: parsed.end,
              })
            }
          />
          <FilterDateSegment
            label={t('dateFilterEnd')}
            value={parsed.end}
            variant={variant}
            size={size}
            onChange={(end) =>
              onChange({
                operator: 'between',
                start: parsed.start,
                end: end ?? null,
              })
            }
            onClear={() =>
              onChange({
                operator: 'between',
                start: parsed.start,
                end: null,
              })
            }
          />
        </>
      );
    case 'last':
    case 'next':
    case 'olderThan':
    case 'newerThan':
      return (
        <RelativeDateAmountFields
          value={{ amount: parsed.amount, unit: parsed.unit }}
          onChange={({ amount, unit }) =>
            onChange({
              operator: parsed.operator,
              amount,
              unit,
            })
          }
          size={size}
          unitOptions={unitOptions}
        />
      );
    case 'year':
      return (
        <Input
          type="number"
          min={1900}
          max={2100}
          step={1}
          value={parsed.year}
          onChange={(e) => {
            const raw = e.target.value;
            const year = raw === '' ? refDate.getFullYear() : Number.parseInt(raw, 10) || refDate.getFullYear();
            onChange({ operator: 'year', year });
          }}
          className={filterInputSegmentClass(size, 'year')}
        />
      );
    default:
      return null;
  }
}

function hasPayload(operator: DateFilterOperatorWithLegacy): boolean {
  return (
    operator === 'between' ||
    operator === 'last' ||
    operator === 'next' ||
    operator === 'olderThan' ||
    operator === 'newerThan' ||
    operator === 'year'
  );
}

export function DateFilterWithOperator({
  value,
  onChange,
  allowEmpty = false,
  referenceDate,
  translationNamespace = 'dataTable',
  variant = 'row',
  size = 'default',
}: {
  value: unknown;
  onChange: (value: DateFilterValue) => void;
  allowEmpty?: boolean;
  referenceDate?: Date;
  translationNamespace?: string;
  variant?: FilterFieldVariant;
  size?: FilterFieldSize;
}) {
  const t = useTranslations(translationNamespace);
  const tStat = useTranslations('dashboard.customizer.stat');
  const refDate = referenceDate ?? new Date();

  const parsed = useMemo(() => parseDateFilterValue(value), [value]);

  const availableOperators = useMemo(() => {
    const emptyOps = allowEmpty ? [...DATE_FILTER_EMPTY_OPERATORS] : [];
    // Keep year parseable but only offer it when already selected (legacy values).
    const legacy = parsed.operator === 'year' ? DATE_FILTER_LEGACY_OPERATORS.filter((op) => op === 'year') : [];
    return [...DATE_FILTER_OPERATORS, ...legacy, ...emptyOps];
  }, [allowEmpty, parsed.operator]);

  const unitOptions = useMemo(
    () =>
      DATE_FILTER_LAST_UNITS.map((unit) => ({
        value: unit as StatDeltaUnit,
        label: tStat(`deltaUnits.${unit}`),
      })),
    [tStat],
  );

  const setOperator = (operator: DateFilterOperatorWithLegacy) => {
    if (operator === parsed.operator) {
      return;
    }
    onChange(createDefaultDateFilterValueForOperator(operator, refDate));
  };

  const operatorLabel = (operator: DateFilterOperatorWithLegacy) => t(`dateFilterOperators.${operator}`);
  const showPayload = hasPayload(parsed.operator);
  const useStackedLayout = variant === 'stacked' && showPayload;

  const operatorSelect = (
    <OperatorSelect
      value={parsed.operator}
      onChange={setOperator}
      availableOperators={availableOperators}
      operatorLabel={operatorLabel}
      size={size}
      fullWidth={useStackedLayout}
    />
  );

  const payload = showPayload ? (
    <DateFilterPayload
      parsed={parsed}
      onChange={onChange}
      variant={variant}
      size={size}
      refDate={refDate}
      t={t}
      unitOptions={unitOptions}
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
