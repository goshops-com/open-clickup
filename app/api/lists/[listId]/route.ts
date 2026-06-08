import { NextResponse } from "next/server";
import { z } from "zod";
import { getListData } from "@/lib/queries";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { requireRole } from "@/lib/permissions";
import { readJson, route, ApiError } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ listId: string }> };
const schema = z.object({
  name: z.string().trim().min(1).optional(),
  color: z.string().nullish(),
});

export const GET = route(async (_req, { params }: Ctx) => {
  const { listId } = await params;
  await requireUser();
  const data = await getListData(listId);
  if (!data) throw new ApiError(404, "List not found");
  return NextResponse.json(data);
});

export const PATCH = route(async (req, { params }: Ctx) => {
  const { listId } = await params;
  await requireRole("MEMBER");
  const data = await readJson(req, schema);
  const list = await prisma.list.update({ where: { id: listId }, data });
  return NextResponse.json(list);
});

export const DELETE = route(async (_req, { params }: Ctx) => {
  const { listId } = await params;
  await requireRole("MEMBER");
  await prisma.list.delete({ where: { id: listId } });
  return NextResponse.json({ ok: true });
});
