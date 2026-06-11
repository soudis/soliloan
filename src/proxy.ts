import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

import { LOCALES, routing } from './i18n/routing';
import { auth } from './lib/auth';
import { db } from './lib/db';
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

const handleI18nRouting = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  // Forward projectId from referer when missing (so links without ?projectId= keep the selected project)
  const { searchParams, pathname } = request.nextUrl;
  if (!searchParams.has(PROJECT_ID_KEY)) {
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const prevProjectId = refererUrl.searchParams.get(PROJECT_ID_KEY);
        if (prevProjectId) {
          const newUrl = request.nextUrl.clone();
          newUrl.searchParams.set(PROJECT_ID_KEY, prevProjectId);
          return NextResponse.redirect(newUrl);
        }
      } catch {
        // Ignore invalid referer URLs
      }
    }
    const session = await auth();
    if (session?.user.managerOf && session.user.managerOf.length > 0) {
      console.log('managerOf', session.user.managerOf);
      const newUrl = request.nextUrl.clone();
      newUrl.searchParams.set(PROJECT_ID_KEY, session.user.managerOf[0]);
      return NextResponse.redirect(newUrl);
    }
    if (session?.user.isAdmin) {
      console.log('isAdmin');
      const newUrl = request.nextUrl.clone();
      const project = await db.project.findFirst();
      newUrl.searchParams.set(PROJECT_ID_KEY, project?.id ?? '');
      return NextResponse.redirect(newUrl);
    }
  }

  // Handle authentication
  // ---
  const authResponse = await auth(async (authRequest) => {
    const isAnonymousAllowed = pathMatchesOneOf(authRequest.nextUrl.pathname, ANONYMOUS_ALLOWED_PATHS);
    const isGuestOnlyAuthPage = pathMatchesOneOf(authRequest.nextUrl.pathname, GUEST_ONLY_WHEN_AUTHENTICATED_PATHS);

    if (!authRequest.auth && !isAnonymousAllowed) {
      // Redirect to login page if not authenticated and trying to access private page
      return NextResponse.redirect(new URL('/auth/login', authRequest.nextUrl.origin));
    }
    if (authRequest.auth && isGuestOnlyAuthPage) {
      // Redirect to root if authenticated and trying to access auth pages (not /legal)
      return NextResponse.redirect(new URL('/', authRequest.nextUrl.origin));
    }
  })(request, { params: Promise.resolve({}) });

  // Return response other than 200 to redirect properly
  if (authResponse?.status !== 200) {
    return authResponse;
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
