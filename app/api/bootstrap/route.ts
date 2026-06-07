import { NextResponse } from "next/server";
import { getWorkspaceTree } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { route, ApiError } from "@/lib/api-helpers";

export const GET = route(async () => {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Not authenticated");

  const workspace = await getWorkspaceTree();
  if (!workspace) throw new ApiError(404, "No workspace found");

  // never leak passwordHash to the client
  const currentUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    color: user.color,
    avatarUrl: user.avatarUrl,
  };
  return NextResponse.json({ currentUser, workspace });
});
