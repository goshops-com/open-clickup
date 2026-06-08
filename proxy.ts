import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Redirect unauthenticated page requests to /login (presence check only;
// API routes validate the session for real). Excludes /api, static assets, /login.
// (Next renamed the "middleware" file convention to "proxy".)
export function proxy(req: NextRequest) {
  const hasSession = req.cookies.has("cu_session");
  const { pathname } = req.nextUrl;

  if (!hasSession && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
