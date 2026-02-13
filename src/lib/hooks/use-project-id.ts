import { usePathname } from 'next/navigation';

/**
 * Extracts the projectId from the current URL pathname.
 * The URL pattern is: /[locale]/[projectId]/...
 * Returns null if no projectId segment is found.
 */
export function useProjectId(): string | null {
  const pathname = usePathname();
  // pathname is like /de/[projectId]/lenders/...
  // Split and get the second segment (after locale)
  const segments = pathname.split('/').filter(Boolean);
  // segments[0] = locale (e.g. 'de')
  // segments[1] = projectId (if in a project-scoped route)
  // Known non-project routes at segments[1]: 'projects', 'admin'
  const NON_PROJECT_SEGMENTS = ['projects', 'admin'];
  if (segments.length >= 2 && !NON_PROJECT_SEGMENTS.includes(segments[1])) {
    return segments[1];
  }
  return null;
}
