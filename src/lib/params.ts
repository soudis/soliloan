import { createSearchParamsCache, parseAsString } from 'nuqs/server';

/** URL query key for project scope */
export const PROJECT_ID_KEY = 'projectId';

/** Parser for nuqs (client and server). Empty string when not set. */
export const projectIdParser = parseAsString.withDefault('');

/** Server-side cache for reading params in Page/Layout (via searchParams). */
export const searchParamsCache = createSearchParamsCache({
  [PROJECT_ID_KEY]: projectIdParser,
});
