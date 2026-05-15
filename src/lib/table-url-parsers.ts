import type { ColumnFiltersState, SortingState, VisibilityState } from '@tanstack/react-table';
import { createParser, parseAsInteger, parseAsString } from 'nuqs';

/**
 * Custom nuqs parser that encodes JSON as base64 to produce URL-safe values.
 * This avoids special characters ({, }, [, ], ", :) in the URL that break
 * Next.js RSC payload fetches.
 */
function parseAsBase64Json<T>(validator: (value: unknown) => T | null) {
  return createParser<T>({
    parse: (query) => {
      try {
        const json = atob(query);
        const parsed = JSON.parse(json);
        return validator(parsed);
      } catch {
        return null;
      }
    },
    serialize: (value) => btoa(JSON.stringify(value)),
    eq: (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b),
  });
}

/** Single source of truth for table URL state (DataTable + sidebar view links). */
export const tableUrlParsers = {
  q: parseAsString,
  sort: parseAsBase64Json<SortingState>((v) => {
    if (!Array.isArray(v)) return null;
    return v as SortingState;
  }),
  filters: parseAsBase64Json<ColumnFiltersState>((v) => {
    if (!Array.isArray(v)) return null;
    return v as ColumnFiltersState;
  }),
  cols: parseAsBase64Json<VisibilityState>((v) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
    return v as VisibilityState;
  }),
  page: parseAsInteger,
  pageSize: parseAsInteger,
  view: parseAsString,
} as const;

export const tableUrlNuqsOptions = {
  history: 'replace' as const,
  shallow: true as const,
};
