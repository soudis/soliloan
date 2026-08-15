import type { ColumnFilter } from '@tanstack/react-table';

import { BooleanFilter as BooleanFilterControl } from '@/components/filters/boolean-filter';
import type { FilterFieldSize } from '@/components/filters/filter-field-group';
import type { BooleanFilterValue } from '@/types/boolean-filter-value';

interface BooleanFilterProps {
  filterState?: ColumnFilter;
  onFilterChange: (value: BooleanFilterValue) => void;
  size?: FilterFieldSize;
}

export function BooleanFilter({ filterState, onFilterChange, size = 'default' }: BooleanFilterProps) {
  return <BooleanFilterControl value={filterState?.value} onChange={onFilterChange} size={size} />;
}
