import { create } from "zustand";

type TabValue = "transactions" | "files" | "notes" | "bookings";

interface LoanTabsState {
  activeTab: TabValue;
  setActiveTab: (tab: TabValue) => void;
}

export const useLoanTabsStore = create<LoanTabsState>((set) => ({
  activeTab: "transactions",
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
