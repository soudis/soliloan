'use client';

import type { ViewType } from '@prisma/client';
import type { Table } from '@tanstack/react-table';
import { X } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DataTableColumnFilters } from '@/components/ui/data-table';
import type { SetTableUrlState, TableUrlState } from '@/lib/hooks/use-table-url-state';
import {
  FILTER_REMOVE_VALUE,
  GLOBAL_SEARCH_ALL,
  createDefaultFilterValue,
  getAvailableFilterTargets,
  getVisibleFilterColumnIds,
  removePresentFilter,
  resolveColumnFilterLabel,
  retargetPresentFilter,
  upsertPresentFilterValue,
} from '@/lib/table-filter-presence';
import { cn, NumberParser } from '@/lib/utils';

const EURO_SHORTCUT_COLUMN_IDS = ['amount', 'loan.amount', 'transaction.amount'] as const;

const deNumberParser = new NumberParser('de-DE');

interface DataTableFilterChipProps<TData> {
  table: Table<TData>;
  columnFilters: DataTableColumnFilters;
  tableState: TableUrlState;
  setTableState: SetTableUrlState;
  /** Quick search chip (Alle allowed, not removable) or a present column filter. */
  mode: 'quickSearch' | 'column';
  /** Column id for column-mode chips. */
  columnId?: string;
  viewType?: ViewType;
  onRowClick?: (row: TData) => void;
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

export function DataTableFilterChip<TData>({
  table,
  columnFilters,
  tableState,
  setTableState,
  mode,
  columnId,
  viewType,
  onRowClick,
}: DataTableFilterChipProps<TData>) {
  const t = useTranslations('dataTable');
  const filterContainerRef = useRef<HTMLDivElement>(null);
  const shouldFocusFilterInputRef = useRef(false);

  const isQuickSearch = mode === 'quickSearch';
  const selectedField = isQuickSearch ? tableState.quickSearchField || GLOBAL_SEARCH_ALL : (columnId ?? '');

  const visibleFilterColumnIds = useMemo(
    () => getVisibleFilterColumnIds(table, columnFilters, tableState.columnVisibility),
    [table, columnFilters, tableState.columnVisibility],
  );

  const availableFieldIds = useMemo(() => new Set(visibleFilterColumnIds), [visibleFilterColumnIds]);

  const selectableTargets = useMemo(() => {
    const currentId = selectedField === GLOBAL_SEARCH_ALL ? undefined : selectedField;
    return getAvailableFilterTargets(table, columnFilters, tableState, currentId);
  }, [table, columnFilters, tableState, selectedField]);

  const hashShortcutColumnId = useMemo(
    () => findShortcutColumnId(availableFieldIds, getHashShortcutCandidates(viewType)),
    [availableFieldIds, viewType],
  );

  const euroShortcutColumnId = useMemo(
    () => findShortcutColumnId(availableFieldIds, EURO_SHORTCUT_COLUMN_IDS),
    [availableFieldIds],
  );

  const fieldOptions = useMemo(() => {
    const idsForOptions = isQuickSearch
      ? // QS can pick Alle or any free target (plus its current column)
        [selectedField !== GLOBAL_SEARCH_ALL ? selectedField : null, ...selectableTargets].filter(
          (id): id is string => !!id && availableFieldIds.has(id),
        )
      : // Column chip: current + available; dedupe
        [selectedField, ...selectableTargets.filter((id) => id !== selectedField)].filter(
          (id) => availableFieldIds.has(id) || id === selectedField,
        );

    const uniqueIds = [...new Set(idsForOptions)];

    return uniqueIds.map((id) => {
      const baseLabel = resolveColumnFilterLabel(table, id, columnFilters);
      const shortcut = id === hashShortcutColumnId ? '#' : id === euroShortcutColumnId ? '€' : null;
      return {
        id,
        label: formatFieldLabel(baseLabel, isQuickSearch ? shortcut : null),
      };
    });
  }, [
    isQuickSearch,
    selectedField,
    selectableTargets,
    availableFieldIds,
    table,
    columnFilters,
    hashShortcutColumnId,
    euroShortcutColumnId,
  ]);

  const selectedConfig =
    selectedField === GLOBAL_SEARCH_ALL ? null : columnFilters[selectedField] ?? null;
  const selectedFilterState = tableState.columnFilters.find((filter) => filter.id === selectedField);

  // If QS target column was hidden / removed from config, reset to Alle.
  useEffect(() => {
    if (!isQuickSearch) return;
    if (selectedField !== GLOBAL_SEARCH_ALL && !availableFieldIds.has(selectedField)) {
      setTableState({ quickSearchField: '', globalFilter: '' });
    }
  }, [isQuickSearch, selectedField, availableFieldIds, setTableState]);

  // Ensure a present default entry when a typed target has no stored value yet.
  useEffect(() => {
    if (!selectedConfig || selectedField === GLOBAL_SEARCH_ALL) return;
    if (selectedFilterState) return;
    setTableState({
      columnFilters: upsertPresentFilterValue(
        tableState.columnFilters,
        selectedField,
        createDefaultFilterValue(selectedConfig),
      ),
      ...(isQuickSearch ? { globalFilter: '' } : {}),
    });
  }, [
    selectedConfig,
    selectedField,
    selectedFilterState,
    isQuickSearch,
    setTableState,
    tableState.columnFilters,
  ]);

  useEffect(() => {
    if (!shouldFocusFilterInputRef.current) return;
    if (isQuickSearch && selectedField === GLOBAL_SEARCH_ALL) return;
    const frame = requestAnimationFrame(() => {
      if (!shouldFocusFilterInputRef.current) return;
      shouldFocusFilterInputRef.current = false;
      const input = filterContainerRef.current?.querySelector<HTMLInputElement>(
        'input:not([type="hidden"]):not([role="combobox"])',
      );
      input?.focus();
      input?.select();
    });
    return () => cancelAnimationFrame(frame);
  }, [isQuickSearch, selectedField]);

  const setColumnFilterValue = (targetColumnId: string, value: unknown, extra?: Partial<TableUrlState>) => {
    setTableState({
      columnFilters: upsertPresentFilterValue(tableState.columnFilters, targetColumnId, value),
      ...extra,
    });
  };

  const applyShortcut = (targetColumnId: string, remainder: string) => {
    const config = columnFilters[targetColumnId];
    if (!config) return;

    shouldFocusFilterInputRef.current = true;

    // Drop any existing present chip for this column — QS takes ownership.
    const withoutTarget = removePresentFilter(tableState.columnFilters, targetColumnId);

    if (config.type === 'number') {
      const numericValue = parseShortcutRemainderNumber(remainder);
      if (numericValue == null) {
        setTableState({
          quickSearchField: targetColumnId,
          globalFilter: '',
          columnFilters: withoutTarget,
        });
        return;
      }
      setTableState({
        quickSearchField: targetColumnId,
        globalFilter: '',
        columnFilters: upsertPresentFilterValue(withoutTarget, targetColumnId, {
          operator: 'eq',
          value: numericValue,
        }),
      });
      return;
    }

    if (config.type === 'text') {
      const textValue = remainder.trim();
      if (!textValue) {
        setTableState({
          quickSearchField: targetColumnId,
          globalFilter: '',
          columnFilters: withoutTarget,
        });
        return;
      }
      setTableState({
        quickSearchField: targetColumnId,
        globalFilter: '',
        columnFilters: upsertPresentFilterValue(withoutTarget, targetColumnId, {
          operator: 'contains',
          value: textValue,
        }),
      });
      return;
    }

    setTableState({
      quickSearchField: targetColumnId,
      globalFilter: '',
      columnFilters: withoutTarget,
    });
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

  const handleQuickSearchFieldChange = (nextField: string) => {
    const previousField = selectedField;
    let nextFilters = tableState.columnFilters;

    if (previousField !== GLOBAL_SEARCH_ALL) {
      nextFilters = removePresentFilter(nextFilters, previousField);
    }

    if (nextField === GLOBAL_SEARCH_ALL) {
      setTableState({
        quickSearchField: '',
        columnFilters: nextFilters,
        globalFilter: '',
      });
      return;
    }

    // Taking a column that was a present chip: remove that chip entry first, QS owns it.
    nextFilters = removePresentFilter(nextFilters, nextField);

    setTableState({
      quickSearchField: nextField,
      columnFilters: nextFilters,
      globalFilter: '',
    });
  };

  const handleColumnTargetChange = (nextField: string) => {
    if (!columnId) return;

    if (nextField === FILTER_REMOVE_VALUE) {
      setTableState({
        columnFilters: removePresentFilter(tableState.columnFilters, columnId),
      });
      return;
    }

    if (nextField === columnId) return;

    const toConfig = columnFilters[nextField];
    if (!toConfig) return;

    setTableState({
      columnFilters: retargetPresentFilter(tableState.columnFilters, columnId, nextField, toConfig),
    });
  };

  const handleTargetChange = (nextField: string) => {
    if (isQuickSearch) {
      handleQuickSearchFieldChange(nextField);
      return;
    }
    handleColumnTargetChange(nextField);
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

  const sharedSegmentClass = cn(
    'shadow-none',
    isQuickSearch ? 'bg-card dark:bg-card' : 'bg-transparent dark:bg-input/30',
  );
  const quickSearchSurfaceClass =
    '[&_input]:bg-card dark:[&_input]:bg-card [&_button]:bg-card dark:[&_button]:bg-card';

  const selectValue = selectedField || GLOBAL_SEARCH_ALL;

  const fieldSelect = (
    <Select value={selectValue} onValueChange={handleTargetChange}>
      <SelectTrigger
        aria-label={isQuickSearch ? t('globalFilterField') : t('filterTarget')}
        className={cn(filterOperatorSegmentClass('default'), sharedSegmentClass, 'max-w-[9rem] [&>span]:truncate')}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {isQuickSearch ? <SelectItem value={GLOBAL_SEARCH_ALL}>{t('globalFilterAll')}</SelectItem> : null}
        {fieldOptions.map((field) => (
          <SelectItem key={field.id} value={field.id}>
            {field.label}
          </SelectItem>
        ))}
        {!isQuickSearch ? (
          <>
            <SelectSeparator />
            <SelectItem value={FILTER_REMOVE_VALUE} leadingIcon={<X className="size-3.5" />}>
              {t('removeFilter')}
            </SelectItem>
          </>
        ) : null}
      </SelectContent>
    </Select>
  );

  if (!selectedConfig || selectedField === GLOBAL_SEARCH_ALL) {
    return (
      <div className={cn('w-auto max-w-md shrink-0', isQuickSearch && quickSearchSurfaceClass)} onKeyDown={handleEnterOpen}>
        <FilterFieldGroup className="w-auto">
          {fieldSelect}
          {isQuickSearch ? (
            <Input
              placeholder={t('globalFilter') || 'Search all columns...'}
              value={tableState.globalFilter}
              onChange={(event) => {
                handleGlobalFilterChange(event.target.value);
              }}
              className={cn('max-w-52 shrink-0', sharedSegmentClass)}
            />
          ) : null}
        </FilterFieldGroup>
      </div>
    );
  }

  const filterControl = (() => {
    const onChange = (value: unknown) => {
      if (isQuickSearch) {
        setColumnFilterValue(selectedField, value, { globalFilter: '' });
        return;
      }
      setColumnFilterValue(selectedField, value);
    };

    switch (selectedConfig.type) {
      case 'boolean':
        return <BooleanFilter filterState={selectedFilterState} onFilterChange={onChange} />;
      case 'select':
        return (
          <SelectFilter
            filterState={selectedFilterState}
            options={selectedConfig.options || []}
            allowEmpty={selectedConfig.allowEmpty}
            onFilterChange={onChange}
          />
        );
      case 'multi-select':
        return (
          <MultiSelectFilter
            filterState={selectedFilterState}
            options={selectedConfig.options || []}
            allowEmpty={selectedConfig.allowEmpty}
            onFilterChange={onChange}
          />
        );
      case 'number':
        return (
          <NumberFilter
            filterState={selectedFilterState}
            allowEmpty={selectedConfig.allowEmpty}
            defaultOperator={selectedConfig.defaultOperator}
            onFilterChange={onChange}
          />
        );
      case 'date':
        return (
          <DateFilter
            filterState={selectedFilterState}
            allowEmpty={selectedConfig.allowEmpty}
            onFilterChange={onChange}
          />
        );
      default:
        return (
          <TextFilter
            filterState={selectedFilterState}
            label={selectedConfig.label}
            columnId={selectedField}
            allowEmpty={selectedConfig.allowEmpty}
            onFilterChange={onChange}
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
        '[&>:last-child>*:first-child]:rounded-l-none [&>:last-child>*:first-child]:border-l-0',
        '[&>:last-child:not(fieldset)]:rounded-l-none [&>:last-child:not(fieldset)]:border-l-0',
        '[&_fieldset]:w-auto',
        isQuickSearch && quickSearchSurfaceClass,
      )}
    >
      {fieldSelect}
      {filterControl}
    </div>
  );
}
