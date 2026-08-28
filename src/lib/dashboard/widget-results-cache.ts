import { revalidatePath } from 'next/cache';

import type { DashboardWidgetResultsByScope } from '@/lib/dashboard/widget-compute-result-types';

/**
 * Mutations bust immediately. TTL only covers “until today” clock drift between writes.
 * Layout identity is not hashed: normalizing layouts can mint new widget/series ids on
 * every read, which made JSON hashes miss even when bouncing between the same projects.
 */
export const DASHBOARD_WIDGET_RESULTS_TTL_MS = 60 * 60 * 1000;

const MAX_CACHE_ENTRIES = 256;

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

function calendarDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildDashboardWidgetResultsCacheKey(
  projectId: string,
  userId: string,
  locale: string,
  toDate: Date,
): string {
  return `${projectId}:${userId}:${locale}:${calendarDayKey(toDate)}`;
}

function pruneExpired(store: Map<string, DashboardWidgetResultsCacheEntry>, now = Date.now()): void {
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(key);
    }
  }
}

function touchLru(
  store: Map<string, DashboardWidgetResultsCacheEntry>,
  key: string,
  entry: DashboardWidgetResultsCacheEntry,
): void {
  store.delete(key);
  store.set(key, entry);
}

function logCache(event: 'hit' | 'miss' | 'set', key: string): void {
  if (process.env.ENVIRONMENT !== 'staging' && process.env.NODE_ENV !== 'development') {
    return;
  }
  console.info(`[dashboard-cache] ${event} ${key}`);
}

export function getDashboardWidgetResultsCache(key: string): DashboardWidgetResultsCacheEntry | null {
  const store = getStore();
  const entry = store.get(key);
  if (!entry) {
    logCache('miss', key);
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    logCache('miss', key);
    return null;
  }
  touchLru(store, key, entry);
  logCache('hit', key);
  return entry;
}

export function setDashboardWidgetResultsCache(
  key: string,
  entry: Omit<DashboardWidgetResultsCacheEntry, 'expiresAt'>,
): void {
  const store = getStore();
  pruneExpired(store);
  if (store.size >= MAX_CACHE_ENTRIES && !store.has(key)) {
    const oldestKey = store.keys().next().value;
    if (oldestKey) {
      store.delete(oldestKey);
    }
  }
  store.set(key, {
    ...entry,
    expiresAt: Date.now() + DASHBOARD_WIDGET_RESULTS_TTL_MS,
  });
  logCache('set', key);
}

function revalidateDashboardPath(): void {
  revalidatePath('/dashboard');
}

export function invalidateDashboardWidgetResultsCache(projectId: string): void {
  const store = getStore();
  const prefix = `${projectId}:`;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
  revalidateDashboardPath();
}

export function invalidateDashboardWidgetResultsCacheForUser(userId: string): void {
  const store = getStore();
  for (const key of store.keys()) {
    const parts = key.split(':');
    if (parts[1] === userId) {
      store.delete(key);
    }
  }
  revalidateDashboardPath();
}

export function clearDashboardWidgetResultsCache(): void {
  getStore().clear();
  revalidateDashboardPath();
}
