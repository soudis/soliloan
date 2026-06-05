'use client';

import { createContext, useContext, useMemo } from 'react';

import type { DashboardLayoutData, DashboardLayoutScopeKey } from '@/types/dashboard-layout';

export type SetDashboardLayout = (
  layout: DashboardLayoutData | ((prev: DashboardLayoutData) => DashboardLayoutData),
) => void;

/** Layout data + persistence scope. Changes whenever the layout is edited. */
export type DashboardLayoutDataValue = {
  layout: DashboardLayoutData;
  setLayout: SetDashboardLayout;
  scope: DashboardLayoutScopeKey;
  projectId: string;
};

/** Editor UI state. Kept separate so selection/customize toggles don't invalidate layout-data consumers. */
export type DashboardEditorValue = {
  isCustomizing: boolean;
  selectedWidgetId: string | null;
  setSelectedWidgetId: (id: string | null) => void;
};

const DashboardLayoutDataContext = createContext<DashboardLayoutDataValue | null>(null);
const DashboardEditorContext = createContext<DashboardEditorValue | null>(null);

export function DashboardLayoutProvider({
  layout,
  setLayout,
  scope,
  projectId,
  isCustomizing,
  selectedWidgetId,
  setSelectedWidgetId,
  children,
}: DashboardLayoutDataValue & DashboardEditorValue & { children: React.ReactNode }) {
  const dataValue = useMemo<DashboardLayoutDataValue>(
    () => ({ layout, setLayout, scope, projectId }),
    [layout, setLayout, scope, projectId],
  );

  const editorValue = useMemo<DashboardEditorValue>(
    () => ({ isCustomizing, selectedWidgetId, setSelectedWidgetId }),
    [isCustomizing, selectedWidgetId, setSelectedWidgetId],
  );

  return (
    <DashboardLayoutDataContext.Provider value={dataValue}>
      <DashboardEditorContext.Provider value={editorValue}>{children}</DashboardEditorContext.Provider>
    </DashboardLayoutDataContext.Provider>
  );
}

export function useDashboardLayoutData() {
  const ctx = useContext(DashboardLayoutDataContext);
  if (!ctx) {
    throw new Error('useDashboardLayoutData must be used within DashboardLayoutProvider');
  }
  return ctx;
}

export function useDashboardEditor() {
  const ctx = useContext(DashboardEditorContext);
  if (!ctx) {
    throw new Error('useDashboardEditor must be used within DashboardLayoutProvider');
  }
  return ctx;
}
