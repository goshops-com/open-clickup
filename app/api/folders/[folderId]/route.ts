import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { readJson, route } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ folderId: string }> };
const schema = z.object({
  name: z.string().trim().min(1).optional(),
  collapsed: z.boolean().optional(),
});

export const PATCH = route(async (req, { params }: Ctx) => {
  const { folderId } = await params;
  await requireRole("MEMBER");
  const data = await readJson(req, schema);
  const folder = await prisma.folder.update({ where: { id: folderId }, data });
  return NextResponse.json(folder);
});

export const DELETE = route(async (_req, { params }: Ctx) => {
  const { folderId } = await params;
  await requireRole("MEMBER");
  await prisma.folder.delete({ where: { id: folderId } });
  return NextResponse.json({ ok: true });
});
