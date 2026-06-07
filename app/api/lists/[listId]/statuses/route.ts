import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { StatusType } from "@/lib/generated/prisma/client";
import { readJson, route } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ listId: string }> };

const createSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  color: z.string().optional(),
  type: z.enum(["NOT_STARTED", "ACTIVE", "DONE", "CLOSED"]).optional(),
});

const reorderSchema = z.object({ ids: z.array(z.string()).min(1) });

export const POST = route(async (req, { params }: Ctx) => {
  const { listId } = await params;
  const { name, color, type } = await readJson(req, createSchema);
  const last = await prisma.status.findFirst({ where: { listId }, orderBy: { position: "desc" } });
  const status = await prisma.status.create({
    data: {
      listId,
      name,
      color: color ?? "#87909e",
      type: (type as StatusType) ?? StatusType.NOT_STARTED,
      position: (last?.position ?? 0) + 1,
    },
  });
  return NextResponse.json(status, { status: 201 });
});

export const PUT = route(async (req, { params }: Ctx) => {
  const { listId } = await params;
  const { ids } = await readJson(req, reorderSchema);
  await prisma.$transaction(
    ids.map((id, i) => prisma.status.update({ where: { id }, data: { position: i } })),
  );
  const statuses = await prisma.status.findMany({ where: { listId }, orderBy: { position: "asc" } });
  return NextResponse.json(statuses);
});
