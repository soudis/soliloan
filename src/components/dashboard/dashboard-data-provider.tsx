'use client';

import { createContext, useContext } from 'react';

import type { DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import type { ProjectWithConfiguration } from '@/types/projects';

export type DashboardDataContextValue = {
  loans: DashboardLoan[];
  toDate: Date;
  project: ProjectWithConfiguration;
};

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

export function DashboardDataProvider({
  children,
  loans,
  toDate,
  project,
}: {
  children: React.ReactNode;
  loans: DashboardLoan[];
  toDate: Date;
  project: ProjectWithConfiguration;
}) {
  return (
    <DashboardDataContext.Provider value={{ loans, toDate, project }}>{children}</DashboardDataContext.Provider>
  );
}

export function useDashboardData(): DashboardDataContextValue {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error('useDashboardData must be used within DashboardDataProvider');
  }
  return ctx;
}
