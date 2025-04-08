import { ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/react-table'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewType = 'LENDER' | 'LOAN'

interface TableState {
  columnVisibility: VisibilityState
  sorting: SortingState
  columnFilters: ColumnFiltersState
  globalFilter: string
  pageSize: number
}

interface TableStore {
  states: Record<ViewType, TableState>
  setState: (viewType: ViewType, state: Partial<TableState>) => void
  getState: (viewType: ViewType) => TableState
}

const defaultTableState: TableState = {
  columnVisibility: {},
  sorting: [],
  columnFilters: [],
  globalFilter: '',
  pageSize: 10,
}

export const useTableStore = create<TableStore>()(
  persist(
    (set, get) => ({
      states: {
        LENDER: defaultTableState,
        LOAN: defaultTableState,
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
    }),
    {
      name: 'table-storage',
    }
  )
) 