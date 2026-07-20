import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Coming Soon mode — redirects every public route to the homepage.
 * To disable: remove this file (or set COMING_SOON=false in your env).
 */

const COMING_SOON = true;

// Routes that should never be redirected (API, static files, etc.)
const BYPASS_PREFIXES = ["/api/", "/_next/", "/favicon.ico"];

export function middleware(request: NextRequest) {
  if (!COMING_SOON) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Allow internal Next.js routes and API calls through
  if (BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Already on the homepage — let it through
  if (pathname === "/") {
    return NextResponse.next();
  }

  // Redirect everything else to the Coming Soon page (homepage)
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
