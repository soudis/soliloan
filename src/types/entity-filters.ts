import type { DataTableColumnFilterDefinition } from '@/lib/entity-filters/filter-definitions';

export type EntityFilterEntity = 'loan' | 'lender';

export type EntityFilter = {
  id: string;
  field: string;
  entity: EntityFilterEntity;
  value: unknown;
};

export type EntityFilterFieldOption = DataTableColumnFilterDefinition & {
  field: string;
  entity: EntityFilterEntity;
  group: 'loan' | 'lender';
};
