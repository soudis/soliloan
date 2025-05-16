import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ColorScheme = 'default' | 'ocean' | 'forest' | 'sunset' | 'lavender';

interface AppState {
  theme: 'light' | 'dark';
  colorScheme: ColorScheme;
  setTheme: (theme: 'light' | 'dark') => void;
  setColorScheme: (scheme: ColorScheme) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'light',
      colorScheme: 'default',
      setTheme: (theme) => set({ theme }),
      setColorScheme: (colorScheme) => set({ colorScheme }),
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    }),
    {
      name: 'app-storage',
    },
  ),
);
