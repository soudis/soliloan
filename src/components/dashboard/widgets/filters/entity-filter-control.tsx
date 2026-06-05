'use client';

import type { ColumnFilter } from '@tanstack/react-table';

import {
  DateFilter,
  MultiSelectFilter,
  NumberFilter,
  SelectFilter,
  TextFilter,
} from '@/components/ui/data-table-column-filters/index';
import type { DataTableColumnFilterDefinition } from '@/lib/entity-filters/filter-definitions';

export function EntityFilterControl({
  definition,
  value,
  onChange,
}: {
  definition: DataTableColumnFilterDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const filterState: ColumnFilter | undefined = value === '' || value == null ? undefined : { id: 'filter', value };

  switch (definition.type) {
    case 'select':
      return (
        <SelectFilter
          filterState={filterState}
          options={definition.options ?? []}
          onFilterChange={(v) => onChange(v)}
        />
      );
    case 'multi-select':
      return (
        <MultiSelectFilter
          filterState={filterState}
          options={definition.options ?? []}
          onFilterChange={(v) => onChange(v)}
        />
      );
    case 'number':
      return <NumberFilter filterState={filterState} onFilterChange={(v) => onChange(v)} />;
    case 'date':
      return <DateFilter filterState={filterState} onFilterChange={(v) => onChange(v)} />;
    default:
      return (
        <TextFilter
          filterState={filterState}
          label={definition.label}
          columnId="filter"
          onFilterChange={(v) => onChange(v)}
        />
      );
  }
}
