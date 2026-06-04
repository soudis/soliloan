'use client';

import { createContext, useContext } from 'react';

import type { DashboardLayoutData, DashboardLayoutScopeKey } from '@/types/dashboard-layout';

export type SetDashboardLayout = (
  layout: DashboardLayoutData | ((prev: DashboardLayoutData) => DashboardLayoutData),
) => void;

export type DashboardLayoutContextValue = {
  layout: DashboardLayoutData;
  setLayout: SetDashboardLayout;
  scope: DashboardLayoutScopeKey;
  projectId: string;
  isCustomizing: boolean;
  selectedWidgetId: string | null;
  setSelectedWidgetId: (id: string | null) => void;
};

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(null);

export function DashboardLayoutProvider({
  value,
  children,
}: {
  value: DashboardLayoutContextValue;
  children: React.ReactNode;
}) {
  return <DashboardLayoutContext.Provider value={value}>{children}</DashboardLayoutContext.Provider>;
}

export function useDashboardLayout() {
  const ctx = useContext(DashboardLayoutContext);
  if (!ctx) {
    throw new Error('useDashboardLayout must be used within DashboardLayoutProvider');
  }
  return ctx;
}
