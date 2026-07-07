import type { ColumnFilter } from '@tanstack/react-table';

import type { FilterFieldSize, FilterFieldVariant } from '@/components/filters/filter-field-group';
import { TextFilterWithOperator } from '@/components/filters/text-filter-with-operator';

interface TextFilterProps {
  filterState?: ColumnFilter;
  onFilterChange: (value: unknown) => void;
  label?: string;
  columnId: string;
  allowEmpty?: boolean;
  variant?: FilterFieldVariant;
  size?: FilterFieldSize;
}

export function TextFilter({
  filterState,
  label,
  columnId,
  onFilterChange,
  allowEmpty = false,
  variant = 'row',
  size = 'default',
}: TextFilterProps) {
  return (
    <TextFilterWithOperator
      value={filterState?.value}
      onChange={onFilterChange}
      allowEmpty={allowEmpty}
      translationNamespace="dataTable"
      variant={variant}
      size={size}
      placeholder={`Filter ${label || columnId}...`}
    />
  );
}
