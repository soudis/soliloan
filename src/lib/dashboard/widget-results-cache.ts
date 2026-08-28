import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';

import type { DashboardWidgetResultsByScope } from '@/lib/dashboard/widget-compute-result-types';
import type { DashboardLayoutData } from '@/types/dashboard-layout';

/**
 * Mutations bust immediately. TTL only covers “until today” clock drift between writes.
 * One hour is plenty: interest accrual over minutes is not dashboard-visible, and
 * a 60s window would recompute on almost every revisit.
 */
export const DASHBOARD_WIDGET_RESULTS_TTL_MS = 60 * 60 * 1000;

const MAX_CACHE_ENTRIES = 64;

type DashboardWidgetResultsCacheEntry = {
  projectId: string;
  toDate: string;
  widgetResults: DashboardWidgetResultsByScope;
  expiresAt: number;
};

const globalForCache = globalThis as unknown as {
  dashboardWidgetResultsCache?: Map<string, DashboardWidgetResultsCacheEntry>;
};

function getStore(): Map<string, DashboardWidgetResultsCacheEntry> {
  if (!globalForCache.dashboardWidgetResultsCache) {
    globalForCache.dashboardWidgetResultsCache = new Map();
  }
  return globalForCache.dashboardWidgetResultsCache;
}

function hashLayout(layout: DashboardLayoutData): string {
  return createHash('sha256').update(JSON.stringify(layout)).digest('hex').slice(0, 16);
}

function calendarDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildDashboardWidgetResultsCacheKey(
  projectId: string,
  locale: string,
  projectLayout: DashboardLayoutData,
  userLayout: DashboardLayoutData,
  toDate: Date,
): string {
  return `${projectId}:${locale}:${calendarDayKey(toDate)}:${hashLayout(projectLayout)}:${hashLayout(userLayout)}`;
}

function pruneExpired(store: Map<string, DashboardWidgetResultsCacheEntry>, now = Date.now()): void {
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

export function getDashboardWidgetResultsCache(key: string): DashboardWidgetResultsCacheEntry | null {
  const store = getStore();
  const entry = store.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry;
}

export function setDashboardWidgetResultsCache(
  key: string,
  entry: Omit<DashboardWidgetResultsCacheEntry, 'expiresAt'>,
): void {
  const store = getStore();
  pruneExpired(store);
  if (store.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey) {
      store.delete(oldestKey);
    }
  }
  store.set(key, {
    ...entry,
    expiresAt: Date.now() + DASHBOARD_WIDGET_RESULTS_TTL_MS,
  });
}

export function invalidateDashboardWidgetResultsCache(projectId: string): void {
  const store = getStore();
  const prefix = `${projectId}:`;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
  revalidatePath('/dashboard');
}
