'use client';

import { useCallback } from 'react';

import { useProjectId } from '@/lib/hooks/use-project-id';
import { withProjectId } from '@/lib/project-href';

/** Builds hrefs that keep the current `projectId` query param. */
export function useProjectHref() {
  const projectId = useProjectId();
  return useCallback((href: string) => withProjectId(href, projectId), [projectId]);
}
