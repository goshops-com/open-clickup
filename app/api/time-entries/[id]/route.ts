import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, route } from "@/lib/api-helpers";
import { publish } from "@/lib/events";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route(async (_req, { params }: Ctx) => {
  const { id } = await params;
  await requireUser();

  const entry = await prisma.timeEntry.findUnique({
    where: { id },
    include: { task: { select: { listId: true } } },
  });
  if (!entry) throw new ApiError(404, "Time entry not found");

  await prisma.timeEntry.delete({ where: { id } });
  publish({ type: "list", listId: entry.task.listId });
  return NextResponse.json({ ok: true });
});
