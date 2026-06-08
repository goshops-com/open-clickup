import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { route } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route(async (_req, { params }: Ctx) => {
  const { id } = await params;
  await requireRole("MEMBER");
  await prisma.taskTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
