import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJson, route } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ itemId: string }> };
const schema = z.object({
  name: z.string().trim().min(1).optional(),
  resolved: z.boolean().optional(),
});

export const PATCH = route(async (req, { params }: Ctx) => {
  const { itemId } = await params;
  const data = await readJson(req, schema);
  const item = await prisma.checklistItem.update({ where: { id: itemId }, data });
  return NextResponse.json(item);
});

export const DELETE = route(async (_req, { params }: Ctx) => {
  const { itemId } = await params;
  await prisma.checklistItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
});
