import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { taskReturnPath } from "@/lib/task-return-path";

// Redirect unauthenticated page requests to /login (presence check only;
// API routes validate the session for real). Excludes /api, static assets, /login.
// (Next renamed the "middleware" file convention to "proxy".)
export function proxy(req: NextRequest) {
  const hasSession = req.cookies.has("cu_session");
  const { pathname, searchParams } = req.nextUrl;

  if (!hasSession && pathname !== "/login") {
    const login = new URL("/login", req.url);
    const task = searchParams.get("task");
    const next = task && taskReturnPath(`${pathname}?task=${encodeURIComponent(task)}`);
    if (next) login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  }
  if (hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL(taskReturnPath(searchParams.get("next")) ?? "/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
