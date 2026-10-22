import type { ColumnFilter } from '@tanstack/react-table';

import type { FilterFieldSize, FilterFieldVariant } from '@/components/filters/filter-field-group';
import { DurationFilterWithOperator } from '@/components/filters/duration-filter-with-operator';
import type { DurationFilterOperator } from '@/types/duration-filter-value';

interface DurationFilterProps {
  filterState?: ColumnFilter;
  onFilterChange: (value: unknown) => void;
  allowEmpty?: boolean;
  terminationValue?: boolean;
  defaultOperator?: DurationFilterOperator;
  variant?: FilterFieldVariant;
  size?: FilterFieldSize;
}

export function DurationFilter({
  filterState,
  onFilterChange,
  allowEmpty = false,
  terminationValue = false,
  defaultOperator = 'between',
  variant = 'row',
  size = 'default',
}: DurationFilterProps) {
  return (
    <DurationFilterWithOperator
      value={filterState?.value}
      onChange={onFilterChange}
      allowEmpty={allowEmpty}
      terminationValue={terminationValue}
      defaultOperator={defaultOperator}
      translationNamespace="dataTable"
      variant={variant}
      size={size}
    />
  );
}
