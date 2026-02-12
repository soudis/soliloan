import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

import { LOCALES, routing } from './i18n/routing';
import { auth } from './lib/auth';

const PUBLIC_PAGES = ['/auth/login', '/auth/forgot-password', '/auth/register', '/auth/set-password'];

const handleI18nRouting = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Handle authentication
  // ---
  const authResponse = await auth(async (authRequest) => {
    const publicPathnameRegex = RegExp(
      `^(/(${LOCALES.join('|')}))?(${PUBLIC_PAGES.flatMap((p) => (p === '/' ? ['', '/'] : p)).join('|')})/?$`,
      'i',
    );
    const isPublicPage = publicPathnameRegex.test(authRequest.nextUrl.pathname);

    if (!authRequest.auth && !isPublicPage) {
      // Redirect to login page if not authenticated and trying to access private page
      return NextResponse.redirect(new URL('/auth/login', authRequest.nextUrl.origin));
    }
    if (authRequest.auth && isPublicPage) {
      // Redirect to root if authenticated and trying to access public page
      return NextResponse.redirect(new URL('/dashboard', authRequest.nextUrl.origin));
    }
  })(request, {});

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
