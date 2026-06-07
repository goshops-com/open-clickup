import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { StatusType } from "@/lib/generated/prisma/client";
import { readJson, route, ApiError } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ statusId: string }> };
const schema = z.object({
  name: z.string().trim().min(1).optional(),
  color: z.string().optional(),
  type: z.enum(["NOT_STARTED", "ACTIVE", "DONE", "CLOSED"]).optional(),
});

export const PATCH = route(async (req, { params }: Ctx) => {
  const { statusId } = await params;
  const body = await readJson(req, schema);
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.color !== undefined) data.color = body.color;
  if (body.type !== undefined) data.type = body.type as StatusType;
  const status = await prisma.status.update({ where: { id: statusId }, data });
  return NextResponse.json(status);
});

export const DELETE = route(async (_req, { params }: Ctx) => {
  const { statusId } = await params;
  const status = await prisma.status.findUnique({ where: { id: statusId } });
  if (!status) throw new ApiError(404, "Status not found");

  const siblings = await prisma.status.findMany({
    where: { listId: status.listId, id: { not: statusId } },
    orderBy: { position: "asc" },
  });
  if (siblings.length === 0) {
    throw new ApiError(400, "Cannot delete the only status");
  }
  const fallback = siblings[0];
  await prisma.task.updateMany({ where: { statusId }, data: { statusId: fallback.id } });
  await prisma.status.delete({ where: { id: statusId } });
  return NextResponse.json({ ok: true, movedTo: fallback.id });
});
