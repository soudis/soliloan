import type { NextResponse } from 'next/server';

/** Cookie storing the last project the current user worked on (keyed by user id). */
export const LAST_PROJECT_COOKIE_NAME = 'last-project-id';

const LAST_PROJECT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function serializeLastProjectCookie(userId: string, projectId: string): string {
  return `${userId}:${projectId}`;
}

/** Returns the project id when the cookie belongs to this user; otherwise null. */
export function parseLastProjectCookie(raw: string | undefined, userId: string | undefined): string | null {
  if (!raw || !userId) return null;
  const separatorIndex = raw.indexOf(':');
  if (separatorIndex <= 0) return null;
  const cookieUserId = raw.slice(0, separatorIndex);
  const projectId = raw.slice(separatorIndex + 1);
  if (cookieUserId !== userId || projectId.length === 0) return null;
  return projectId;
}

export function userCanAccessProject(
  projectId: string,
  user: { isAdmin?: boolean; managerOf?: string[] } | null | undefined,
): boolean {
  if (!user || projectId.length === 0) return false;
  if (user.isAdmin) return true;
  return user.managerOf?.includes(projectId) ?? false;
}

export function firstAccessibleProjectId(
  candidates: Array<string | null | undefined>,
  allowedProjectIds: readonly string[],
): string | undefined {
  const allowed = new Set(allowedProjectIds);
  for (const id of candidates) {
    if (id && allowed.has(id)) return id;
  }
  return undefined;
}

export function setLastProjectCookie(
  response: NextResponse,
  userId: string,
  projectId: string,
  options?: { secure?: boolean },
): void {
  response.cookies.set({
    name: LAST_PROJECT_COOKIE_NAME,
    value: serializeLastProjectCookie(userId, projectId),
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: LAST_PROJECT_COOKIE_MAX_AGE_SECONDS,
    secure: options?.secure ?? process.env.NODE_ENV === 'production',
  });
}
