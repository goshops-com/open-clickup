import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api-helpers";

export { hashPassword, verifyPassword } from "@/lib/password";

const SESSION_COOKIE = "cu_session";
const SESSION_DAYS = 30;

// ----------------------------------------------------------------------------
// Sessions (server-side, revocable, httpOnly cookie holds the session id)
// ----------------------------------------------------------------------------

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400 * 1000);
  const session = await prisma.session.create({ data: { userId, expiresAt } });
  const store = await cookies();
  store.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return session;
}

/** Current user from the session cookie, or null if not authenticated. */
export async function getCurrentUser() {
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  const session = await prisma.session.findUnique({
    where: { id: sid },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

/** Like getCurrentUser but throws 401 — use in mutations that require a user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Not authenticated");
  return user;
}

export async function destroySession() {
  const store = await cookies();
  const sid = store.get(SESSION_COOKIE)?.value;
  if (sid) {
    await prisma.session.deleteMany({ where: { id: sid } });
    store.delete(SESSION_COOKIE);
  }
}
