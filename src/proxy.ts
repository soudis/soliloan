import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

import { LOCALES, routing } from './i18n/routing';
import { auth } from './lib/auth';
import { db } from './lib/db';
import {
  LAST_PROJECT_COOKIE_NAME,
  parseLastProjectCookie,
  setLastProjectCookie,
  userCanAccessProject,
} from './lib/last-project-cookie';
import { sanitizeLoginCallbackUrl } from './lib/login-callback-url';
import { PROJECT_ID_KEY } from './lib/params';

/** Paths that do not require a session (login flow + legal notice). */
const ANONYMOUS_ALLOWED_PATHS = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/register',
  '/auth/set-password',
  '/legal',
];

/** Authenticated users are sent to home from these (auth UI only), not from /legal. */
const GUEST_ONLY_WHEN_AUTHENTICATED_PATHS = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/register',
  '/auth/set-password',
];

function pathMatchesOneOf(pathname: string, paths: string[]): boolean {
  const alternation = paths.flatMap((p) => (p === '/' ? ['', '/'] : p)).join('|');
  return new RegExp(`^(/(${LOCALES.join('|')}))?(${alternation})/?$`, 'i').test(pathname);
}

function redirectWithProjectId(request: NextRequest, projectId: string, userId?: string): NextResponse {
  const newUrl = request.nextUrl.clone();
  newUrl.searchParams.set(PROJECT_ID_KEY, projectId);
  const response = NextResponse.redirect(newUrl);
  if (userId && projectId) {
    setLastProjectCookie(response, userId, projectId, { secure: request.nextUrl.protocol === 'https:' });
  }
  return response;
}

function applySetCookies(from: Response, to: NextResponse) {
  for (const cookie of from.headers.getSetCookie()) {
    to.headers.append('set-cookie', cookie);
  }
}

type ProxySessionUser = { id?: string; isAdmin?: boolean; managerOf?: string[] };

/** Project id to attach when the request URL has none. Uses the session already read for auth. */
async function resolveMissingProjectId(
  request: NextRequest,
  sessionUser: ProxySessionUser | undefined,
): Promise<string | null> {
  const userId = sessionUser?.id;
  const lastProjectId = parseLastProjectCookie(request.cookies.get(LAST_PROJECT_COOKIE_NAME)?.value, userId);
  if (lastProjectId && userCanAccessProject(lastProjectId, sessionUser)) {
    return lastProjectId;
  }
  if (sessionUser?.managerOf && sessionUser.managerOf.length > 0) {
    return sessionUser.managerOf[0];
  }
  if (sessionUser?.isAdmin) {
    const project = await db.project.findFirst({ select: { id: true } });
    return project?.id ?? null;
  }
  return null;
}

const handleI18nRouting = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl;
  const projectIdFromUrl = searchParams.get(PROJECT_ID_KEY);

  // Handle authentication
  // ---
  let sessionUser: ProxySessionUser | undefined;

  const authResponse = await auth(async (authRequest) => {
    sessionUser = authRequest.auth?.user;
    const isAnonymousAllowed = pathMatchesOneOf(authRequest.nextUrl.pathname, ANONYMOUS_ALLOWED_PATHS);
    const isGuestOnlyAuthPage = pathMatchesOneOf(authRequest.nextUrl.pathname, GUEST_ONLY_WHEN_AUTHENTICATED_PATHS);

    if (!authRequest.auth && !isAnonymousAllowed) {
      const loginUrl = new URL('/auth/login', authRequest.nextUrl.origin);
      const callback = sanitizeLoginCallbackUrl(`${authRequest.nextUrl.pathname}${authRequest.nextUrl.search}`);
      if (callback) {
        loginUrl.searchParams.set('callbackUrl', callback);
      }
      return NextResponse.redirect(loginUrl);
    }
    if (authRequest.auth && isGuestOnlyAuthPage) {
      const callback = sanitizeLoginCallbackUrl(authRequest.nextUrl.searchParams.get('callbackUrl'));
      return NextResponse.redirect(new URL(callback ?? '/', authRequest.nextUrl.origin));
    }
  })(request, { params: Promise.resolve({}) });

  // Return response other than 200 to redirect properly
  if (authResponse?.status !== 200) {
    return authResponse;
  }

  // Attach the selected project when a link omitted ?projectId=
  if (!projectIdFromUrl) {
    const projectId = await resolveMissingProjectId(request, sessionUser);
    if (projectId) {
      const redirectResponse = redirectWithProjectId(request, projectId, sessionUser?.id);
      if (authResponse) {
        applySetCookies(authResponse, redirectResponse);
      }
      return redirectResponse;
    }
  }

  // Handle i18n
  // ---
  const i18nNextResponse = handleI18nRouting(request);

  // Pass auth cookies to i18nNextResponse
  if (authResponse) {
    // Transform Response to NextResponse to be able to get cookies
    const authNextResponse = NextResponse.next(authResponse);

    for (const cookie of authNextResponse.cookies.getAll()) {
      i18nNextResponse.cookies.set(cookie);
    }
  }
  i18nNextResponse.headers.set('x-pathname', pathname);
  i18nNextResponse.headers.set('x-url', request.url);

  if (projectIdFromUrl && sessionUser?.id && userCanAccessProject(projectIdFromUrl, sessionUser)) {
    setLastProjectCookie(i18nNextResponse, sessionUser.id, projectIdFromUrl, {
      secure: request.nextUrl.protocol === 'https:',
    });
  }

  return i18nNextResponse;
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - /api (API routes)
    // - /_next (Next.js internals)
    // - /_vercel (Vercel internals)
    // - /static (inside /public)
    // - all files in the public folder
    '/((?!api|_next|_vercel|static|.*\\..*|favicon.ico).*)',
  ],
};
