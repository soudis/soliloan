import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export { useNavigationUiStore } from './navigation-ui';

interface AppState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    }),
    {
      name: 'app-storage',
    },
  ),
);
