'use client';

import { useLocale, useTranslations } from 'next-intl';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import type { DashboardLender, DashboardLoan } from '@/actions/dashboard/get-dashboard-stats';
import { useProject } from '@/components/providers/project-provider';
import { buildCumulativeTimeline } from '@/lib/dashboard/history-table/cumulative-timeline';
import { buildAllFilterFieldOptions } from '@/lib/entity-filters/filter-definitions';
import type { EntityFilterFieldOption } from '@/types/entity-filters';
import type { ProjectWithConfiguration } from '@/types/projects';

export type DashboardDataContextValue = {
  loans: DashboardLoan[];
  lenders: DashboardLender[];
  toDate: Date;
  project: ProjectWithConfiguration;
  fieldOptions: EntityFilterFieldOption[];
  getOrComputeWidgetResult: <T>(key: string, compute: () => T) => T;
};

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

export function DashboardDataProvider({
  children,
  loans,
  lenders,
  toDate,
}: {
  children: React.ReactNode;
  loans: DashboardLoan[];
  lenders: DashboardLender[];
  toDate: Date;
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
      loans.map((loan) =>
        loan.cumulativeTimeline
          ? loan
          : {
              ...loan,
              cumulativeTimeline: buildCumulativeTimeline(loan.history),
            },
      ),
    [loans],
  );

  // Cached widget results bake in translated labels, so invalidate on locale change as well as data change.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only clear cache when data or locale changes
  useEffect(() => {
    computeCacheRef.current.clear();
  }, [loansWithTimeline, lenders, toDate, locale]);

  const getOrComputeWidgetResult = useCallback(<T,>(key: string, compute: () => T): T => {
    // Namespace by locale so a language switch never serves stale, previously-translated results.
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
    }),
    [loansWithTimeline, lenders, toDate, project, fieldOptions, getOrComputeWidgetResult],
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
