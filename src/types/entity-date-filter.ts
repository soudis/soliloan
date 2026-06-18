import type { StatDeltaUnit } from '@/types/dashboard-widgets/stat-widget';
import { STAT_DELTA_UNITS } from '@/types/dashboard-widgets/stat-widget';

export const ENTITY_DATE_FILTER_MODES = ['fixed', 'relative'] as const;

export type EntityDateFilterMode = (typeof ENTITY_DATE_FILTER_MODES)[number];

export type EntityDateFilterValue =
  | {
      mode: 'fixed';
      start: string | null;
      end: string | null;
    }
  | {
      mode: 'relative';
      amount: number;
      unit: StatDeltaUnit;
    };

export function createDefaultEntityDateFilterValue(): EntityDateFilterValue {
  return {
    mode: 'fixed',
    start: null,
    end: null,
  };
}

export function createDefaultRelativeEntityDateFilterValue(): EntityDateFilterValue {
  return {
    mode: 'relative',
    amount: 12,
    unit: 'months',
  };
}

function isStatDeltaUnit(value: unknown): value is StatDeltaUnit {
  return typeof value === 'string' && (STAT_DELTA_UNITS as readonly string[]).includes(value);
}

export function parseEntityDateFilterValue(raw: unknown): EntityDateFilterValue {
  if (Array.isArray(raw)) {
    const [start, end] = raw as [string | null | undefined, string | null | undefined];
    return {
      mode: 'fixed',
      start: start ?? null,
      end: end ?? null,
    };
  }

  if (!raw || typeof raw !== 'object') {
    return createDefaultEntityDateFilterValue();
  }

  const value = raw as {
    mode?: EntityDateFilterMode;
    start?: string | null;
    end?: string | null;
    amount?: number;
    unit?: StatDeltaUnit;
  };
  if (value.mode === 'relative') {
    const amount = Number(value.amount);
    return {
      mode: 'relative',
      amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 12,
      unit: isStatDeltaUnit(value.unit) ? value.unit : 'months',
    };
  }

  return {
    mode: 'fixed',
    start: typeof value.start === 'string' ? value.start : null,
    end: typeof value.end === 'string' ? value.end : null,
  };
}
