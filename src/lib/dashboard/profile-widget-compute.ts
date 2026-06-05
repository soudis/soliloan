import type { DashboardWidgetType } from '@/types/dashboard-layout';

export type WidgetComputeProfileEntry = {
  widgetType: DashboardWidgetType | string;
  widgetId: string;
  loanCount: number;
  durationMs: number;
  timestamp: number;
};

export type WidgetComputeProfileBatch = {
  entries: WidgetComputeProfileEntry[];
  loanCount: number;
  totalMs: number;
  recordedAt: number;
};

const isDev = process.env.NODE_ENV === 'development';

class WidgetComputeProfiler {
  private pending: WidgetComputeProfileEntry[] = [];
  private flushScheduled = false;
  private history: WidgetComputeProfileBatch[] = [];
  private readonly maxHistory = 50;

  record(entry: Omit<WidgetComputeProfileEntry, 'timestamp' | 'durationMs'> & { durationMs: number }) {
    this.pending.push({
      ...entry,
      timestamp: performance.now(),
    });

    if (!this.flushScheduled) {
      this.flushScheduled = true;
      queueMicrotask(() => this.flush());
    }
  }

  flush() {
    this.flushScheduled = false;
    const entries = this.pending;
    this.pending = [];

    if (entries.length === 0) {
      return;
    }

    const loanCount = entries[0]?.loanCount ?? 0;
    const totalMs = entries.reduce((sum, entry) => sum + entry.durationMs, 0);
    const batch: WidgetComputeProfileBatch = {
      entries,
      loanCount,
      totalMs,
      recordedAt: performance.now(),
    };

    this.history.unshift(batch);
    if (this.history.length > this.maxHistory) {
      this.history.length = this.maxHistory;
    }

    console.groupCollapsed(
      `[dashboard compute] ${entries.length} widget(s), ${loanCount} loans, total ${totalMs.toFixed(1)}ms`,
    );
    for (const entry of entries) {
      console.log(
        `${entry.widgetType} (${entry.widgetId.slice(0, 8)}): ${entry.durationMs.toFixed(2)}ms`,
      );
    }
    console.groupEnd();
  }

  getHistory(): WidgetComputeProfileBatch[] {
    return [...this.history];
  }

  clearHistory() {
    this.history = [];
  }
}

const profiler = new WidgetComputeProfiler();

declare global {
  interface Window {
    __dashboardComputeProfile?: {
      getHistory: () => WidgetComputeProfileBatch[];
      clearHistory: () => void;
      flush: () => void;
    };
  }
}

if (isDev && typeof window !== 'undefined') {
  window.__dashboardComputeProfile = {
    getHistory: () => profiler.getHistory(),
    clearHistory: () => profiler.clearHistory(),
    flush: () => profiler.flush(),
  };
}

export function profileWidgetCompute<T>({
  widgetType,
  widgetId,
  loanCount,
  compute,
}: {
  widgetType: DashboardWidgetType | string;
  widgetId: string;
  loanCount: number;
  compute: () => T;
}): T {
  if (!isDev) {
    return compute();
  }

  const start = performance.now();
  const result = compute();
  const durationMs = performance.now() - start;

  profiler.record({
    widgetType,
    widgetId,
    loanCount,
    durationMs,
  });

  return result;
}
