import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const hostname = req.headers.get('host') || '';
  const pathname = req.nextUrl.pathname;

  // Redirect non-www to www
  if (hostname === 'dakhlamajalis.com') {
    const url = new URL(req.url);
    url.host = 'www.dakhlamajalis.com';
    return NextResponse.redirect(url, 301);
  }

  // Protect dashboard routes - require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Skip i18n for dashboard, api, and internal Next.js routes
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return;
  }

  // Apply next-intl middleware for all other routes
  return intlMiddleware(req);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
