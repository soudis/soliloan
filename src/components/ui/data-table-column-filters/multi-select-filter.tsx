import type { ColumnFilter } from '@tanstack/react-table';
import { EnumFilterWithOperator } from '@/components/filters/enum-filter-with-operator';
import type { FilterFieldSize, FilterFieldVariant } from '@/components/filters/filter-field-group';

interface MultiSelectFilterProps {
  filterState?: ColumnFilter;
  onFilterChange: (value: unknown) => void;
  options: { label: string; value: string }[];
  allowEmpty?: boolean;
  variant?: FilterFieldVariant;
  size?: FilterFieldSize;
}

export function MultiSelectFilter({
  filterState,
  options,
  onFilterChange,
  allowEmpty = false,
  variant = 'row',
  size = 'default',
}: MultiSelectFilterProps) {
  return (
    <EnumFilterWithOperator
      value={filterState?.value}
      onChange={onFilterChange}
      options={options}
      allowEmpty={allowEmpty}
      defaultOperator="in"
      translationNamespace="dataTable"
      variant={variant}
      size={size}
    />
  );
}
