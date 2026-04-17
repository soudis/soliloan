import { create } from 'zustand';

interface NavigationUiState {
  isProjectSwitching: boolean;
  setProjectSwitching: (v: boolean) => void;
}

export const useNavigationUiStore = create<NavigationUiState>((set) => ({
  isProjectSwitching: false,
  setProjectSwitching: (v) => set({ isProjectSwitching: v }),
}));
