import type { ColumnFilter } from '@tanstack/react-table';

import type { FilterFieldSize, FilterFieldVariant } from '@/components/filters/filter-field-group';
import { EnumFilterWithOperator } from '@/components/filters/enum-filter-with-operator';

interface SelectFilterProps {
  filterState?: ColumnFilter;
  onFilterChange: (value: unknown) => void;
  options: { label: string; value: string }[];
  allowEmpty?: boolean;
  variant?: FilterFieldVariant;
  size?: FilterFieldSize;
}

export function SelectFilter({
  filterState,
  options,
  onFilterChange,
  allowEmpty = false,
  variant = 'row',
  size = 'default',
}: SelectFilterProps) {
  return (
    <EnumFilterWithOperator
      value={filterState?.value}
      onChange={onFilterChange}
      options={options}
      allowEmpty={allowEmpty}
      defaultOperator="eq"
      translationNamespace="dataTable"
      variant={variant}
      size={size}
    />
  );
}
