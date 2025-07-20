import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ConfigurationTabValue = 'general' | 'lender' | 'loans' | 'templates' | 'files';

interface ConfigurationTabsState {
  activeTabs: Record<string, ConfigurationTabValue>;
  getActiveTab: (projectId: string) => ConfigurationTabValue;
  setActiveTab: (projectId: string, tab: ConfigurationTabValue) => void;
}

export const useConfigurationTabsStore = create<ConfigurationTabsState>()(
  persist(
    (set, get) => ({
      activeTabs: {},
      getActiveTab: (projectId) => get().activeTabs[projectId] ?? 'general', // Default to 'general' if no tab is set for the projectId
      setActiveTab: (projectId, tab) =>
        set((state) => ({
          activeTabs: {
            ...state.activeTabs,
            [projectId]: tab,
          },
        })),
    }),
    { name: 'configuration-tabs' },
  ),
);
