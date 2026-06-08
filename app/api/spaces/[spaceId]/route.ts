import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { readJson, route } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ spaceId: string }> };
const schema = z.object({
  name: z.string().trim().min(1).optional(),
  color: z.string().optional(),
  icon: z.string().nullish(),
});

export const PATCH = route(async (req, { params }: Ctx) => {
  const { spaceId } = await params;
  await requireRole("MEMBER");
  const data = await readJson(req, schema);
  const space = await prisma.space.update({ where: { id: spaceId }, data });
  return NextResponse.json(space);
});

export const DELETE = route(async (_req, { params }: Ctx) => {
  const { spaceId } = await params;
  await requireRole("ADMIN");
  await prisma.space.delete({ where: { id: spaceId } });
  return NextResponse.json({ ok: true });
});
