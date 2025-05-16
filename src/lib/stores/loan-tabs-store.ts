import { create } from 'zustand';

type TabValue = 'transactions' | 'files' | 'notes' | 'bookings';

interface LoanTabsState {
  activeTabs: Record<string, TabValue>;
  getActiveTab: (loanId: string) => TabValue;
  setActiveTab: (loanId: string, tab: TabValue) => void;
}

export const useLoanTabsStore = create<LoanTabsState>((set, get) => ({
  activeTabs: {},
  getActiveTab: (loanId) => get().activeTabs[loanId] ?? 'transactions', // Default to 'transactions' if no tab is set for the loanId
  setActiveTab: (loanId, tab) =>
    set((state) => ({
      activeTabs: {
        ...state.activeTabs,
        [loanId]: tab,
      },
    })),
}));
