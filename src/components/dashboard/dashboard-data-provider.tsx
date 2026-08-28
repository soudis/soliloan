'use client';

import { useLocale, useTranslations } from 'next-intl';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import type { DashboardLender, DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { useProject } from '@/components/providers/project-provider';
import { buildCumulativeTimeline } from '@/lib/dashboard/history-table/cumulative-timeline';
import type { DashboardWidgetResultsByScope } from '@/lib/dashboard/widget-compute-result-types';
import { buildAllFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import type { EntityFilterFieldOption } from '@/types/entity-filters';
import type { ProjectWithConfiguration } from '@/types/projects';

const EMPTY_WIDGET_RESULTS: DashboardWidgetResultsByScope = { project: {}, user: {} };

export type DashboardDataContextValue = {
  loans: DashboardLoan[];
  lenders: DashboardLender[];
  toDate: Date;
  project: ProjectWithConfiguration;
  fieldOptions: EntityFilterFieldOption[];
  getOrComputeWidgetResult: <T>(key: string, compute: () => T) => T;
  hasFullDataset: boolean;
  widgetResults: DashboardWidgetResultsByScope;
};

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

export function DashboardDataProvider({
  children,
  loans,
  lenders,
  toDate,
  hasFullDataset,
  widgetResults = EMPTY_WIDGET_RESULTS,
}: {
  children: React.ReactNode;
  loans: DashboardLoan[];
  lenders: DashboardLender[];
  toDate: Date;
  hasFullDataset: boolean;
  widgetResults?: DashboardWidgetResultsByScope;
}) {
  const { project } = useProject();
  const tLoans = useTranslations('dashboard.loans');
  const tLenders = useTranslations('dashboard.lenders');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const computeCacheRef = useRef(new Map<string, unknown>());

  const loansWithTimeline = useMemo(
    () =>
      hasFullDataset
        ? loans.map((loan) =>
            loan.cumulativeTimeline
              ? loan
              : {
                  ...loan,
                  cumulativeTimeline: buildCumulativeTimeline(loan.history),
                },
          )
        : loans,
    [hasFullDataset, loans],
  );

  // Cached widget results bake in translated labels, so invalidate on locale change as well as data change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only clear cache when data or locale changes
  useEffect(() => {
    computeCacheRef.current.clear();
  }, [loansWithTimeline, lenders, toDate, locale]);

  const getOrComputeWidgetResult = useCallback(<T,>(key: string, compute: () => T): T => {
    const namespacedKey = `${localeRef.current}:${key}`;
    const cached = computeCacheRef.current.get(namespacedKey);
    if (cached !== undefined) {
      return cached as T;
    }
    const result = compute();
    computeCacheRef.current.set(namespacedKey, result);
    return result;
  }, []);

  const fieldOptions = useMemo(
    () => buildAllFilterFieldOptions(project, tLoans, tLenders, commonT),
    [project, tLoans, tLenders, commonT],
  );

  const value = useMemo(
    () => ({
      loans: loansWithTimeline,
      lenders,
      toDate,
      project,
      fieldOptions,
      getOrComputeWidgetResult,
      hasFullDataset,
      widgetResults,
    }),
    [
      loansWithTimeline,
      lenders,
      toDate,
      project,
      fieldOptions,
      getOrComputeWidgetResult,
      hasFullDataset,
      widgetResults,
    ],
  );

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData(): DashboardDataContextValue {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error('useDashboardData must be used within DashboardDataProvider');
  }
  return ctx;
}
