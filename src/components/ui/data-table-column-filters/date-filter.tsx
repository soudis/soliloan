import type { ColumnFilter } from '@tanstack/react-table';

import type { FilterFieldSize, FilterFieldVariant } from '@/components/filters/filter-field-group';
import { DateFilterWithOperator } from '@/components/filters/date-filter-with-operator';
import type { DateFilterValue } from '@/types/date-filter-value';

interface DateFilterProps {
  filterState?: ColumnFilter;
  onFilterChange: (value: DateFilterValue | undefined) => void;
  allowEmpty?: boolean;
  variant?: FilterFieldVariant;
  size?: FilterFieldSize;
}

export function DateFilter({
  filterState,
  onFilterChange,
  allowEmpty = false,
  variant = 'row',
  size = 'default',
}: DateFilterProps) {
  return (
    <DateFilterWithOperator
      value={filterState?.value}
      onChange={onFilterChange}
      allowEmpty={allowEmpty}
      translationNamespace="dataTable"
      variant={variant}
      size={size}
    />
  );
}
