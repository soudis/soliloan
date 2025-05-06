import { create } from "zustand";

interface LenderLoanSelectionState {
  selectedLoanIds: Record<string, string | undefined>; // Map lenderId to selected loanId
  getSelectedLoanId: (lenderId: string) => string | undefined;
  setSelectedLoanId: (lenderId: string, loanId: string | undefined) => void;
}

export const useLenderLoanSelectionStore = create<LenderLoanSelectionState>(
  (set, get) => ({
    selectedLoanIds: {},
    getSelectedLoanId: (lenderId) => get().selectedLoanIds[lenderId],
    setSelectedLoanId: (lenderId, loanId) =>
      set((state) => ({
        selectedLoanIds: {
          ...state.selectedLoanIds,
          [lenderId]: loanId,
        },
      })),
  })
);
