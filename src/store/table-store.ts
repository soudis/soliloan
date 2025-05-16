import { ViewType } from '@prisma/client';
import { TableState } from '@tanstack/react-table';
import { create } from 'zustand';

export type ViewState = Partial<TableState> & { selectedView?: string };

interface TableStore {
  states: Record<ViewType, ViewState>;
  setState: (viewType: ViewType, state: ViewState) => void;
  getState: (viewType: ViewType) => ViewState;
}

const defaultTableState: ViewState = {
  selectedView: 'init',
  columnVisibility: {},
  sorting: [],
  columnFilters: [],
  globalFilter: '',
  pagination: {
    pageIndex: 0,
    pageSize: 25,
  },
};

export const useTableStore = create<TableStore>()((set, get) => ({
  states: {
    LENDER: defaultTableState,
    LOAN: defaultTableState,
    LOGBOOK: defaultTableState,
  },
  setState: (viewType, newState) =>
    set((state) => ({
      states: {
        ...state.states,
        [viewType]: {
          ...state.states[viewType],
          ...newState,
        },
      },
    })),
  getState: (viewType) => get().states[viewType] || defaultTableState,
}));
