'use client';

import type { ColumnFilter } from '@tanstack/react-table';

import { EntityDateFilter } from '@/components/dashboard/widgets/filters/entity-date-filter';
import {
  BooleanFilter,
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
    case 'boolean':
      return (
        <BooleanFilter
          filterState={filterState}
          onFilterChange={(v) => onChange(v)}
          size="sm"
        />
      );
    case 'select':
      return (
        <SelectFilter
          filterState={filterState}
          options={definition.options ?? []}
          allowEmpty={definition.allowEmpty}
          onFilterChange={(v) => onChange(v)}
          variant="stacked"
          size="sm"
        />
      );
    case 'multi-select':
      return (
        <MultiSelectFilter
          filterState={filterState}
          options={definition.options ?? []}
          allowEmpty={definition.allowEmpty}
          onFilterChange={(v) => onChange(v)}
          variant="stacked"
          size="sm"
        />
      );
    case 'number':
      return (
        <NumberFilter
          filterState={filterState}
          allowEmpty={definition.allowEmpty}
          defaultOperator={definition.defaultOperator}
          onFilterChange={(v) => onChange(v)}
          variant="stacked"
          size="sm"
        />
      );
    case 'date':
      return (
        <EntityDateFilter
          value={value}
          onChange={onChange}
          allowEmpty={definition.allowEmpty}
        />
      );
    default:
      return (
        <TextFilter
          filterState={filterState}
          label={definition.label}
          columnId="filter"
          allowEmpty={definition.allowEmpty}
          onFilterChange={(v) => onChange(v)}
          variant="stacked"
          size="sm"
        />
      );
  }
}
