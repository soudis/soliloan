'use client';

import type { View } from '@prisma/client';
import type { ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/react-table';
import { isEqual } from 'lodash';
import { createParser, parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useCallback, useMemo } from 'react';

export type TableUrlState = {
  globalFilter: string;
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  pageIndex: number;
  pageSize: number;
  selectedView: string;
};

export type SetTableUrlState = (update: Partial<TableUrlState>) => void;

/**
 * Custom nuqs parser that encodes JSON as base64 to produce URL-safe values.
 * This avoids special characters ({, }, [, ], ", :) in the URL that break
 * Next.js RSC payload fetches.
 */
function parseAsBase64Json<T>(validator: (value: unknown) => T | null) {
  return createParser<T>({
    parse: (query) => {
      try {
        const json = atob(query);
        const parsed = JSON.parse(json);
        return validator(parsed);
      } catch {
        return null;
      }
    },
    serialize: (value) => btoa(JSON.stringify(value)),
    eq: (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b),
  });
}

/** The baseline state when no view is selected */
const DEFAULT_BASELINE: TableUrlState = {
  globalFilter: '',
  sorting: [],
  columnFilters: [],
  columnVisibility: {},
  pageIndex: 0,
  pageSize: 25,
  selectedView: '',
};

const tableParsers = {
  q: parseAsString,
  sort: parseAsBase64Json<SortingState>((v) => {
    if (!Array.isArray(v)) return null;
    return v as SortingState;
  }),
  filters: parseAsBase64Json<ColumnFiltersState>((v) => {
    if (!Array.isArray(v)) return null;
    return v as ColumnFiltersState;
  }),
  cols: parseAsBase64Json<VisibilityState>((v) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
    return v as VisibilityState;
  }),
  page: parseAsInteger,
  pageSize: parseAsInteger,
  view: parseAsString,
};

/**
 * Extract a baseline TableUrlState from a View's JSON data.
 */
function viewToBaseline(
  // biome-ignore lint/suspicious/noExplicitAny: view data is stored as JSON
  data: any,
  defaultColumnVisibility: VisibilityState,
): Omit<TableUrlState, 'selectedView'> {
  return {
    globalFilter: data?.globalFilter ?? '',
    sorting: data?.sorting ?? [],
    columnFilters: data?.columnFilters ?? [],
    columnVisibility: data?.columnVisibility ?? defaultColumnVisibility,
    pageIndex: 0, // always reset page on view load
    pageSize: data?.pagination?.pageSize ?? data?.pageSize ?? 25,
  };
}

interface UseTableUrlStateOptions {
  defaultColumnVisibility?: VisibilityState;
  views?: View[];
}

export function useTableUrlState(options: UseTableUrlStateOptions = {}) {
  const { defaultColumnVisibility = {}, views = [] } = options;

  const [rawState, setRawState] = useQueryStates(tableParsers, {
    history: 'replace',
  });

  // Compute the baseline from the selected view (or defaults)
  const baseline = useMemo<TableUrlState>(() => {
    const selectedViewId = rawState.view;

    if (selectedViewId) {
      const view = views.find((v) => v.id === selectedViewId);
      if (view?.data) {
        return {
          selectedView: selectedViewId,
          ...viewToBaseline(view.data, defaultColumnVisibility),
        };
      }
    }

    // No view selected — use defaults
    return {
      ...DEFAULT_BASELINE,
      columnVisibility: defaultColumnVisibility,
      selectedView: rawState.view ?? '',
    };
  }, [rawState.view, views, defaultColumnVisibility]);

  // Merge baseline with URL overrides to produce effective state
  const state = useMemo<TableUrlState>(() => {
    return {
      globalFilter: rawState.q ?? baseline.globalFilter,
      sorting: rawState.sort ?? baseline.sorting,
      columnFilters: rawState.filters ?? baseline.columnFilters,
      columnVisibility: rawState.cols ? { ...defaultColumnVisibility, ...rawState.cols } : baseline.columnVisibility,
      pageIndex: rawState.page ?? baseline.pageIndex,
      pageSize: rawState.pageSize ?? baseline.pageSize,
      selectedView: rawState.view ?? baseline.selectedView,
    };
  }, [rawState, baseline, defaultColumnVisibility]);

  // setState: only write values that differ from baseline, clear those that match
  const setState: SetTableUrlState = useCallback(
    (update) => {
      const raw: Record<string, unknown> = {};

      // When the view changes, compute the new baseline immediately so we can
      // clear all overrides that match it.
      let effectiveBaseline = baseline;
      if (update.selectedView !== undefined && update.selectedView !== baseline.selectedView) {
        const newViewId = update.selectedView;
        if (newViewId) {
          const view = views.find((v) => v.id === newViewId);
          if (view?.data) {
            effectiveBaseline = {
              selectedView: newViewId,
              ...viewToBaseline(view.data, defaultColumnVisibility),
            };
          }
        } else {
          effectiveBaseline = {
            ...DEFAULT_BASELINE,
            columnVisibility: defaultColumnVisibility,
            selectedView: '',
          };
        }
      }

      // View param: write if non-empty, clear if empty
      if (update.selectedView !== undefined) {
        raw.view = update.selectedView || null;
      }

      // For each field, write to URL only if different from baseline, otherwise clear
      if (update.globalFilter !== undefined) {
        raw.q = update.globalFilter !== effectiveBaseline.globalFilter ? update.globalFilter : null;
      }
      if (update.sorting !== undefined) {
        raw.sort = !isEqual(update.sorting, effectiveBaseline.sorting) ? update.sorting : null;
      }
      if (update.columnFilters !== undefined) {
        raw.filters = !isEqual(update.columnFilters, effectiveBaseline.columnFilters) ? update.columnFilters : null;
      }
      if (update.columnVisibility !== undefined) {
        raw.cols = !isEqual(update.columnVisibility, effectiveBaseline.columnVisibility)
          ? update.columnVisibility
          : null;
      }
      if (update.pageIndex !== undefined) {
        raw.page = update.pageIndex !== effectiveBaseline.pageIndex ? update.pageIndex : null;
      }
      if (update.pageSize !== undefined) {
        raw.pageSize = update.pageSize !== effectiveBaseline.pageSize ? update.pageSize : null;
      }

      setRawState(raw);
    },
    [baseline, views, defaultColumnVisibility, setRawState],
  );

  return { state, setState };
}
