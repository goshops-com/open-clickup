import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError } from "@/lib/api-helpers";

export type Role = "GUEST" | "MEMBER" | "ADMIN" | "OWNER";

const ROLE_RANK: Record<Role, number> = { GUEST: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 };

/** The current user's membership in their (single) workspace, or null. */
export async function getMembership(userId: string) {
  return prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Require the current user to have at least `min` role in the workspace.
 * Throws 401 if not authenticated, 403 if under-privileged.
 * Single-workspace app: resolves the user's first membership.
 */
export async function requireRole(min: Role) {
  const user = await requireUser();
  const membership = await getMembership(user.id);
  if (!membership || ROLE_RANK[membership.role as Role] < ROLE_RANK[min]) {
    throw new ApiError(403, `This action requires ${min.toLowerCase()} access.`);
  }
  return { user, role: membership.role as Role, workspaceId: membership.workspaceId };
}
