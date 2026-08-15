import type { ColumnFilter } from '@tanstack/react-table';

import type { FilterFieldSize, FilterFieldVariant } from '@/components/filters/filter-field-group';
import { NumberFilterWithOperator } from '@/components/filters/number-filter-with-operator';

interface NumberFilterProps {
  filterState?: ColumnFilter;
  onFilterChange: (value: unknown) => void;
  allowEmpty?: boolean;
  variant?: FilterFieldVariant;
  size?: FilterFieldSize;
}

export function NumberFilter({
  filterState,
  onFilterChange,
  allowEmpty = false,
  variant = 'row',
  size = 'default',
}: NumberFilterProps) {
  return (
    <NumberFilterWithOperator
      value={filterState?.value}
      onChange={onFilterChange}
      allowEmpty={allowEmpty}
      translationNamespace="dataTable"
      variant={variant}
      size={size}
    />
  );
}
