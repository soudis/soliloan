import { z } from 'zod';

/** Upper bound for filter lists attached to a widget, column or series. */
export const MAX_WIDGET_FILTERS = 50;

/**
 * Single source of truth for a persisted entity filter. Kept intentionally lenient on `value`
 * (it is type-checked at read time by the per-field matchers) but bounded everywhere it is used.
 */
export const entityFilterSchema = z.object({
  id: z.string().max(200),
  field: z.string().max(200),
  entity: z.enum(['loan', 'lender', 'transaction']),
  value: z.unknown(),
});

/** Bounded array of entity filters with the shared default. */
export const entityFiltersSchema = z.array(entityFilterSchema).max(MAX_WIDGET_FILTERS).default([]);
