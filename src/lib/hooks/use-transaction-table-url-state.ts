'use client';

import type { View } from '@prisma/client';
import type { VisibilityState } from '@tanstack/react-table';
import { isEqual } from 'lodash';
import { useQueryStates } from 'nuqs';
import { useCallback, useMemo } from 'react';

import {
  parseTransactionExtraViewData,
  type TransactionTableExtraViewData,
  transactionTableUrlNuqsOptions,
  transactionTableUrlParsers,
} from '@/lib/hooks/transaction-table-url-parsers';
import type { SetTableUrlState, TableUrlState } from '@/lib/hooks/use-table-url-state';
import {
  DEFAULT_TRANSACTION_TIME_RANGE,
  getDefaultTransactionCustomFrom,
  getDefaultTransactionCustomTo,
  type TransactionTimeRangePreset,
} from '@/lib/transactions/transaction-time-range';

export type TransactionTableUrlState = TableUrlState & TransactionTableExtraViewData;

const DEFAULT_BASELINE: Omit<TransactionTableUrlState, 'selectedView'> = {
  globalFilter: '',
  sorting: [{ id: 'transaction.date', desc: true }],
  columnFilters: [],
  columnVisibility: {},
  pageIndex: 0,
  pageSize: 25,
  txRange: DEFAULT_TRANSACTION_TIME_RANGE,
  txRangeFrom: getDefaultTransactionCustomFrom(),
  txRangeTo: getDefaultTransactionCustomTo(),
  includeInterest: false,
};

function viewToBaseline(
  // biome-ignore lint/suspicious/noExplicitAny: view data is stored as JSON
  data: any,
  defaultColumnVisibility: VisibilityState,
): Omit<TransactionTableUrlState, 'selectedView'> {
  const extra = parseTransactionExtraViewData(data);
  return {
    globalFilter: data?.globalFilter ?? '',
    sorting: data?.sorting ?? DEFAULT_BASELINE.sorting,
    columnFilters: data?.columnFilters ?? [],
    columnVisibility: data?.columnVisibility ?? defaultColumnVisibility,
    pageIndex: 0,
    pageSize: data?.pagination?.pageSize ?? data?.pageSize ?? 25,
    ...extra,
  };
}

interface UseTransactionTableUrlStateOptions {
  defaultColumnVisibility?: VisibilityState;
  views?: View[];
}

const EMPTY_COLUMN_VISIBILITY: VisibilityState = {};
const EMPTY_VIEWS: View[] = [];

export function useTransactionTableUrlState(options: UseTransactionTableUrlStateOptions = {}) {
  const defaultColumnVisibility = options.defaultColumnVisibility ?? EMPTY_COLUMN_VISIBILITY;
  const views = options.views ?? EMPTY_VIEWS;

  const [rawState, setRawState] = useQueryStates(transactionTableUrlParsers, transactionTableUrlNuqsOptions);

  const baseline = useMemo<TransactionTableUrlState>(() => {
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

    return {
      ...DEFAULT_BASELINE,
      columnVisibility: defaultColumnVisibility,
      selectedView: rawState.view ?? '',
    };
  }, [rawState.view, views, defaultColumnVisibility]);

  const state = useMemo<TransactionTableUrlState>(() => {
    return {
      globalFilter: rawState.q ?? baseline.globalFilter,
      sorting: rawState.sort ?? baseline.sorting,
      columnFilters: rawState.filters ?? baseline.columnFilters,
      columnVisibility: rawState.cols ? { ...defaultColumnVisibility, ...rawState.cols } : baseline.columnVisibility,
      pageIndex: rawState.page ?? baseline.pageIndex,
      pageSize: rawState.pageSize ?? baseline.pageSize,
      selectedView: rawState.view ?? baseline.selectedView,
      txRange: rawState.txRange ?? baseline.txRange,
      txRangeFrom: rawState.txRangeFrom ?? baseline.txRangeFrom,
      txRangeTo: rawState.txRangeTo ?? baseline.txRangeTo,
      includeInterest: rawState.includeInterest ?? baseline.includeInterest,
    };
  }, [rawState, baseline, defaultColumnVisibility]);

  const setState = useCallback(
    (update: Partial<TransactionTableUrlState>) => {
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

      const raw: Record<string, unknown> = {};

      if (update.selectedView !== undefined) {
        raw.view = update.selectedView || null;
      }
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
      if (update.txRange !== undefined) {
        raw.txRange = update.txRange !== effectiveBaseline.txRange ? update.txRange : null;
      }
      if (update.txRangeFrom !== undefined) {
        raw.txRangeFrom = update.txRangeFrom !== effectiveBaseline.txRangeFrom ? update.txRangeFrom : null;
      }
      if (update.txRangeTo !== undefined) {
        raw.txRangeTo = update.txRangeTo !== effectiveBaseline.txRangeTo ? update.txRangeTo : null;
      }
      if (update.includeInterest !== undefined) {
        raw.includeInterest =
          update.includeInterest !== effectiveBaseline.includeInterest ? update.includeInterest : null;
      }

      setRawState(raw, { shallow: true, history: 'replace' });
    },
    [baseline, views, defaultColumnVisibility, setRawState],
  );

  const extraViewData = useMemo(
    (): TransactionTableExtraViewData => ({
      txRange: state.txRange,
      txRangeFrom: state.txRangeFrom,
      txRangeTo: state.txRangeTo,
      includeInterest: state.includeInterest,
    }),
    [state.txRange, state.txRangeFrom, state.txRangeTo, state.includeInterest],
  );

  const isExtraViewDataDirty = useCallback(
    (savedData: Record<string, unknown> | undefined) => {
      const saved = parseTransactionExtraViewData(savedData);
      return (
        state.txRange !== saved.txRange ||
        state.txRangeFrom !== saved.txRangeFrom ||
        state.txRangeTo !== saved.txRangeTo ||
        state.includeInterest !== saved.includeInterest
      );
    },
    [state.txRange, state.txRangeFrom, state.txRangeTo, state.includeInterest],
  );

  return {
    state,
    setState: setState as SetTableUrlState & ((update: Partial<TransactionTableUrlState>) => void),
    extraViewData,
    isExtraViewDataDirty,
  };
}

export function getTransactionTimeRangeFromState(state: TransactionTableUrlState): {
  txRange: TransactionTimeRangePreset;
  txRangeFrom: string;
  txRangeTo: string;
  includeInterest: boolean;
} {
  return {
    txRange: state.txRange as TransactionTimeRangePreset,
    txRangeFrom: state.txRangeFrom,
    txRangeTo: state.txRangeTo,
    includeInterest: state.includeInterest,
  };
}
