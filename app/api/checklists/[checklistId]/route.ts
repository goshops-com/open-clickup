import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { readJson, route } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ checklistId: string }> };
const schema = z.object({ name: z.string().trim().min(1) });

export const PATCH = route(async (req, { params }: Ctx) => {
  const { checklistId } = await params;
  await requireRole("MEMBER");
  const { name } = await readJson(req, schema);
  const checklist = await prisma.checklist.update({ where: { id: checklistId }, data: { name } });
  return NextResponse.json(checklist);
});

export const DELETE = route(async (_req, { params }: Ctx) => {
  const { checklistId } = await params;
  await requireRole("MEMBER");
  await prisma.checklist.delete({ where: { id: checklistId } });
  return NextResponse.json({ ok: true });
});
