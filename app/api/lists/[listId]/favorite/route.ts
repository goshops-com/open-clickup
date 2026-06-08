import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { route } from "@/lib/api-helpers";
import { publish } from "@/lib/events";

type Ctx = { params: Promise<{ listId: string }> };

// Toggle the current user's favorite for this list.
export const POST = route(async (_req, { params }: Ctx) => {
  const { listId } = await params;
  const user = await requireUser();

  const existing = await prisma.favorite.findUnique({
    where: { userId_listId: { userId: user.id, listId } },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
  } else {
    await prisma.favorite.create({ data: { userId: user.id, listId } });
  }
  publish({ type: "bootstrap" });
  return NextResponse.json({ favorited: !existing });
});
