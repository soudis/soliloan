'use client';

import { useQueryState } from 'nuqs';

import { PROJECT_ID_KEY, projectIdParser } from '@/lib/params';

/**
 * Reads projectId from the URL search params (nuqs).
 * Returns null when not set or empty.
 */
export function useProjectId(): string | null {
  const [projectId] = useQueryState(PROJECT_ID_KEY, projectIdParser);
  return projectId && projectId.length > 0 ? projectId : null;
}
