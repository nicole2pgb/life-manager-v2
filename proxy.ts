import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optimistic check only: no session cookie on a protected path -> /login.
// The real session check happens in server code (getCurrentUser); the pages
// under /login and /register redirect signed-in users themselves.
// /api/health is the uptime-monitor probe; it must answer without a session.
const PUBLIC_PATHS = ["/login", "/register", "/api/health"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (!request.cookies.has("session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
