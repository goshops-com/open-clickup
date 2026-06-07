import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, route } from "@/lib/api-helpers";
import { publish } from "@/lib/events";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route(async (_req, { params }: Ctx) => {
  const { id } = await params;
  await requireUser();

  const dep = await prisma.taskDependency.findUnique({
    where: { id },
    include: { blocker: { select: { listId: true } } },
  });
  if (!dep) throw new ApiError(404, "Dependency not found");

  await prisma.taskDependency.delete({ where: { id } });
  publish({ type: "list", listId: dep.blocker.listId });
  return NextResponse.json({ ok: true });
});
