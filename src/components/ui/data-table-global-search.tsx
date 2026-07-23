'use client';

import type { ViewType } from '@prisma/client';
import type { ColumnFiltersState, Table } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, useEffect, useMemo, useRef } from 'react';

import { FilterFieldGroup, filterOperatorSegmentClass } from '@/components/filters/filter-field-group';
import {
  BooleanFilter,
  DateFilter,
  MultiSelectFilter,
  NumberFilter,
  SelectFilter,
  TextFilter,
} from '@/components/ui/data-table-column-filters/index';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SetTableUrlState, TableUrlState } from '@/lib/hooks/use-table-url-state';
import { cn, NumberParser } from '@/lib/utils';
import { isInactiveBooleanFilterValue } from '@/types/boolean-filter-value';
import { isInactiveDateFilterValue } from '@/types/date-filter-value';
import { isInactiveEnumFilterValue } from '@/types/enum-filter-value';
import { isInactiveNumberFilterValue, type NumberFilterOperator } from '@/types/number-filter-value';
import { isInactiveTextFilterValue } from '@/types/text-filter-value';

const GLOBAL_SEARCH_ALL = '__all__';

const EURO_SHORTCUT_COLUMN_IDS = ['amount', 'loan.amount', 'transaction.amount'] as const;

const deNumberParser = new NumberParser('de-DE');

type ColumnFilterConfig = {
  type: 'text' | 'select' | 'multi-select' | 'number' | 'date' | 'boolean';
  options?: { label: string; value: string }[];
  label?: string;
  allowEmpty?: boolean;
  defaultOperator?: NumberFilterOperator;
};

interface DataTableGlobalSearchProps<TData> {
  table: Table<TData>;
  columnFilters: Record<string, ColumnFilterConfig>;
  tableState: TableUrlState;
  setTableState: SetTableUrlState;
  viewType?: ViewType;
  onRowClick?: (row: TData) => void;
}

function isEmptyFilterValue(
  value: unknown,
  type: ColumnFilterConfig['type'],
  defaultOperator?: NumberFilterOperator,
): boolean {
  if (type === 'boolean') {
    return isInactiveBooleanFilterValue(value);
  }

  if (value && typeof value === 'object' && !Array.isArray(value) && 'operator' in value) {
    const operator = (value as { operator: string }).operator;
    if (operator === 'empty' || operator === 'notEmpty') {
      return false;
    }
    switch (type) {
      case 'date':
        return isInactiveDateFilterValue(value);
      case 'number':
        return isInactiveNumberFilterValue(value, defaultOperator);
      case 'select':
        return isInactiveEnumFilterValue(value, 'eq');
      case 'multi-select':
        return isInactiveEnumFilterValue(value, 'in');
      default:
        return isInactiveTextFilterValue(value);
    }
  }

  switch (type) {
    case 'number':
      return isInactiveNumberFilterValue(value, defaultOperator);
    case 'select':
      return isInactiveEnumFilterValue(value, 'eq');
    case 'multi-select':
      return isInactiveEnumFilterValue(value, 'in');
    case 'date':
      return isInactiveDateFilterValue(value);
    default:
      return isInactiveTextFilterValue(value);
  }
}

function parseShortcutRemainderNumber(remainder: string): number | null {
  const trimmed = remainder.trim();
  if (!trimmed) {
    return null;
  }
  const stripped = deNumberParser.strip(trimmed);
  if (!stripped) {
    return null;
  }
  const parsed = deNumberParser.parse(stripped);
  return parsed != null && Number.isFinite(parsed) ? parsed : null;
}

function findShortcutColumnId(availableIds: Set<string>, candidates: readonly string[]): string | null {
  for (const id of candidates) {
    if (availableIds.has(id)) {
      return id;
    }
  }
  return null;
}

/** `#` targets the primary entity number for the current table. */
function getHashShortcutCandidates(viewType?: ViewType): readonly string[] {
  switch (viewType) {
    case 'LOAN':
      return ['loanNumber'];
    case 'LENDER':
      return ['lenderNumber'];
    default:
      return [];
  }
}

function formatFieldLabel(label: string, shortcut: '#' | '€' | null): string {
  return shortcut ? `${label} (${shortcut})` : label;
}

export function DataTableGlobalSearch<TData>({
  table,
  columnFilters,
  tableState,
  setTableState,
  viewType,
  onRowClick,
}: DataTableGlobalSearchProps<TData>) {
  const t = useTranslations('dataTable');
  const selectedField = tableState.quickSearchField || GLOBAL_SEARCH_ALL;
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const shouldFocusFilterInputRef = useRef(false);

  const columnVisibility = tableState.columnVisibility;

  const visibleFilterColumnIds = useMemo(() => {
    return table
      .getAllLeafColumns()
      .filter((column) => {
        const visibleInState = columnVisibility[column.id] !== false;
        return visibleInState && column.getIsVisible() && columnFilters[column.id];
      })
      .map((column) => column.id);
  }, [table, columnFilters, columnVisibility]);

  const availableFieldIds = useMemo(() => new Set(visibleFilterColumnIds), [visibleFilterColumnIds]);

  const hashShortcutColumnId = useMemo(
    () => findShortcutColumnId(availableFieldIds, getHashShortcutCandidates(viewType)),
    [availableFieldIds, viewType],
  );

  const euroShortcutColumnId = useMemo(
    () => findShortcutColumnId(availableFieldIds, EURO_SHORTCUT_COLUMN_IDS),
    [availableFieldIds],
  );

  const fieldOptions = useMemo(() => {
    return visibleFilterColumnIds.map((columnId) => {
      const column = table.getColumn(columnId);
      const config = columnFilters[columnId];
      const baseLabel =
        config.label ?? column?.columnDef.meta?.labelLong ?? column?.columnDef.meta?.export?.label ?? columnId;
      const shortcut = columnId === hashShortcutColumnId ? '#' : columnId === euroShortcutColumnId ? '€' : null;
      return {
        id: columnId,
        label: formatFieldLabel(baseLabel, shortcut),
        config,
      };
    });
  }, [visibleFilterColumnIds, table, columnFilters, hashShortcutColumnId, euroShortcutColumnId]);

  useEffect(() => {
    if (selectedField !== GLOBAL_SEARCH_ALL && !availableFieldIds.has(selectedField)) {
      setTableState({ quickSearchField: '' });
    }
  }, [selectedField, availableFieldIds, setTableState]);

  useEffect(() => {
    if (!shouldFocusFilterInputRef.current || selectedField === GLOBAL_SEARCH_ALL) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      if (!shouldFocusFilterInputRef.current) {
        return;
      }
      shouldFocusFilterInputRef.current = false;
      const input = filterContainerRef.current?.querySelector<HTMLInputElement>(
        'input:not([type="hidden"]):not([role="combobox"])',
      );
      input?.focus();
      input?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedField]);

  const selectedConfig = selectedField === GLOBAL_SEARCH_ALL ? null : columnFilters[selectedField];
  const selectedFilterState = tableState.columnFilters.find((filter) => filter.id === selectedField);

  const upsertColumnFilter = (
    columnId: string,
    value: unknown,
    type: ColumnFilterConfig['type'],
    defaultOperator?: NumberFilterOperator,
    extra?: Partial<Pick<TableUrlState, 'quickSearchField' | 'globalFilter'>>,
  ) => {
    const nextFilters: ColumnFiltersState = tableState.columnFilters.filter((filter) => filter.id !== columnId);
    if (!isEmptyFilterValue(value, type, defaultOperator)) {
      nextFilters.push({ id: columnId, value });
    }
    setTableState({
      columnFilters: nextFilters,
      globalFilter: '',
      ...extra,
    });
  };

  const applyShortcut = (columnId: string, remainder: string) => {
    const config = columnFilters[columnId];
    if (!config) {
      return;
    }

    shouldFocusFilterInputRef.current = true;

    if (config.type === 'number') {
      const numericValue = parseShortcutRemainderNumber(remainder);
      if (numericValue == null) {
        setTableState({ quickSearchField: columnId, globalFilter: '' });
        return;
      }
      upsertColumnFilter(columnId, { operator: 'eq', value: numericValue }, 'number', config.defaultOperator ?? 'eq', {
        quickSearchField: columnId,
      });
      return;
    }

    if (config.type === 'text') {
      const textValue = remainder.trim();
      if (!textValue) {
        setTableState({ quickSearchField: columnId, globalFilter: '' });
        return;
      }
      upsertColumnFilter(columnId, { operator: 'contains', value: textValue }, 'text', config.defaultOperator, {
        quickSearchField: columnId,
      });
      return;
    }

    setTableState({ quickSearchField: columnId, globalFilter: '' });
  };

  const handleGlobalFilterChange = (rawValue: string) => {
    if (hashShortcutColumnId && rawValue.startsWith('#')) {
      applyShortcut(hashShortcutColumnId, rawValue.slice(1));
      return;
    }

    if (euroShortcutColumnId && rawValue.startsWith('€')) {
      applyShortcut(euroShortcutColumnId, rawValue.slice(1));
      return;
    }

    setTableState({ globalFilter: rawValue });
  };

  const handleFieldChange = (nextField: string) => {
    const previousField = selectedField;
    const nextFilters =
      previousField === GLOBAL_SEARCH_ALL
        ? tableState.columnFilters
        : tableState.columnFilters.filter((filter) => filter.id !== previousField);

    if (nextField === GLOBAL_SEARCH_ALL) {
      setTableState({
        quickSearchField: '',
        columnFilters: nextFilters,
        globalFilter: '',
      });
      return;
    }

    setTableState({
      quickSearchField: nextField,
      columnFilters: nextFilters,
      globalFilter: '',
    });
  };

  const handleEnterOpen = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || !onRowClick) return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.closest('[role="listbox"]') || target.closest('[data-radix-select-content]'))
    ) {
      return;
    }
    const filteredRows = table.getFilteredRowModel().rows;
    if (filteredRows.length !== 1) return;
    event.preventDefault();
    onRowClick(filteredRows[0].original);
  };

  const sharedSegmentClass = 'bg-background dark:bg-background shadow-none';

  const fieldSelect = (
    <Select value={selectedField} onValueChange={handleFieldChange}>
      <SelectTrigger
        aria-label={t('globalFilterField')}
        className={cn(filterOperatorSegmentClass('default'), sharedSegmentClass, 'max-w-[11rem] [&>span]:truncate')}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={GLOBAL_SEARCH_ALL}>{t('globalFilterAll')}</SelectItem>
        {fieldOptions.map((field) => (
          <SelectItem key={field.id} value={field.id}>
            {field.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (!selectedConfig || selectedField === GLOBAL_SEARCH_ALL) {
    return (
      <div className="w-auto max-w-md shrink-0" onKeyDown={handleEnterOpen}>
        <FilterFieldGroup className="w-auto">
          {fieldSelect}
          <Input
            placeholder={t('globalFilter') || 'Search all columns...'}
            value={tableState.globalFilter}
            onChange={(event) => {
              handleGlobalFilterChange(event.target.value);
            }}
            className={cn('max-w-60 shrink-0', sharedSegmentClass)}
          />
        </FilterFieldGroup>
      </div>
    );
  }

  const filterControl = (() => {
    switch (selectedConfig.type) {
      case 'boolean':
        return (
          <BooleanFilter
            filterState={selectedFilterState}
            onFilterChange={(value) => {
              upsertColumnFilter(selectedField, value, 'boolean');
            }}
          />
        );
      case 'select':
        return (
          <SelectFilter
            filterState={selectedFilterState}
            options={selectedConfig.options || []}
            allowEmpty={selectedConfig.allowEmpty}
            onFilterChange={(value) => {
              upsertColumnFilter(selectedField, value, 'select');
            }}
          />
        );
      case 'multi-select':
        return (
          <MultiSelectFilter
            filterState={selectedFilterState}
            options={selectedConfig.options || []}
            allowEmpty={selectedConfig.allowEmpty}
            onFilterChange={(value) => {
              upsertColumnFilter(selectedField, value, 'multi-select');
            }}
          />
        );
      case 'number':
        return (
          <NumberFilter
            filterState={selectedFilterState}
            allowEmpty={selectedConfig.allowEmpty}
            defaultOperator={selectedConfig.defaultOperator}
            onFilterChange={(value) => {
              upsertColumnFilter(selectedField, value, 'number', selectedConfig.defaultOperator);
            }}
          />
        );
      case 'date':
        return (
          <DateFilter
            filterState={selectedFilterState}
            allowEmpty={selectedConfig.allowEmpty}
            onFilterChange={(value) => {
              upsertColumnFilter(selectedField, value, 'date');
            }}
          />
        );
      default:
        return (
          <TextFilter
            filterState={selectedFilterState}
            label={selectedConfig.label}
            columnId={selectedField}
            allowEmpty={selectedConfig.allowEmpty}
            onFilterChange={(value) => {
              upsertColumnFilter(selectedField, value, 'text');
            }}
          />
        );
    }
  })();

  return (
    <div
      ref={filterContainerRef}
      onKeyDown={handleEnterOpen}
      className={cn(
        'flex w-auto max-w-xl shrink-0 items-stretch',
        '[&>:first-child]:rounded-r-none',
        // Operator/value FilterFieldGroup — fuse onto its first control
        '[&>:last-child>*:first-child]:rounded-l-none [&>:last-child>*:first-child]:border-l-0',
        // Single-node filters (e.g. boolean) — fuse the control itself
        '[&>:last-child:not(fieldset)]:rounded-l-none [&>:last-child:not(fieldset)]:border-l-0',
        '[&_fieldset]:w-auto',
      )}
    >
      {fieldSelect}
      {filterControl}
    </div>
  );
}
