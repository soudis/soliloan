import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ColorScheme = 'default' | 'ocean' | 'forest' | 'sunset' | 'lavender';

interface AppState {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      colorScheme: 'default',
      setColorScheme: (colorScheme) => set({ colorScheme }),
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    }),
    {
      name: 'app-storage',
    },
  ),
);
