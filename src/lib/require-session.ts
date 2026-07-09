import { notFound, redirect } from 'next/navigation';
import type { Session } from 'next-auth';
import { cache } from 'react';

import { auth } from '@/lib/auth';

export type RequiredSession = Session;

/**
 * Requires a session and redirects if not found. This is meant to be used in pages/layouts, not server functions.
 */
export const requireSession = cache(async (): Promise<RequiredSession> => {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth/login');
  }

  return session as RequiredSession;
});

/**
 * Requires a session as admin and redirects if not found. This is meant to be used in pages/layouts, not server functions
 */
export const requireAdmin = cache(async (): Promise<RequiredSession> => {
  const session = await requireSession();

  if (!session.user.isAdmin) {
    redirect('/');
  }

  return session;
});

/**
 * Requires a session as manager and redirects if not found. This is meant to be used in pages/layouts, not server functions
 */
export const requireManager = cache(async (): Promise<RequiredSession> => {
  const session = await requireSession();

  if (!session.user.isManager) {
    redirect('/dashboard');
  }

  return session;
});

/**
 * Requires a session as manager of a project and redirects if not found. This is meant to be used in pages/layouts, not server functions
 */
export const requiereManagerOfProject = cache(async (projectId: string): Promise<RequiredSession> => {
  const session = await requireSession();

  if (!session.user.isAdmin && !session.user.managerOf.includes(projectId)) {
    notFound();
  }

  return session;
});
