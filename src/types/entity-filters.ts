import type { ColumnGroupMeta } from '@/components/ui/data-table';
import type { DataTableColumnFilterDefinition } from '@/lib/entity-filters/filter-definitions';

export type EntityFilterEntity = 'loan' | 'lender' | 'transaction';

export type EntityFilter = {
  id: string;
  field: string;
  entity: EntityFilterEntity;
  value: unknown;
};

export type EntityFilterFieldOption = DataTableColumnFilterDefinition & {
  field: string;
  entity: EntityFilterEntity;
  /** Coarse entity bucket (legacy); prefer `columnGroup` for UI headings. */
  group: 'loan' | 'lender' | 'transaction';
  /** Subcategory for column pickers (Kredit - Allgemein, …). */
  columnGroup?: ColumnGroupMeta;
};
