import { create } from 'zustand';

export type LenderTabValue = 'files' | 'notes' | 'lender' | 'loans';

interface LenderTabsState {
  activeTabs: Record<string, LenderTabValue>;
  getActiveTab: (lenderId: string) => LenderTabValue;
  setActiveTab: (lenderId: string, tab: LenderTabValue) => void;
}

export const useLenderTabsStore = create<LenderTabsState>((set, get) => ({
  activeTabs: {},
  getActiveTab: (lenderId) => get().activeTabs[lenderId] ?? 'lender', // Default to 'transactions' if no tab is set for the loanId
  setActiveTab: (lenderId, tab) =>
    set((state) => ({
      activeTabs: {
        ...state.activeTabs,
        [lenderId]: tab,
      },
    })),
}));
