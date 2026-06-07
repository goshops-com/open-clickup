import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJson, route } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ taskId: string }> };
const schema = z.object({ name: z.string().trim().min(1).optional() });

export const POST = route(async (req, { params }: Ctx) => {
  const { taskId } = await params;
  const { name } = await readJson(req, schema).catch(() => ({ name: undefined }));
  const last = await prisma.checklist.findFirst({ where: { taskId }, orderBy: { position: "desc" } });
  const checklist = await prisma.checklist.create({
    data: { taskId, name: name?.trim() || "Checklist", position: (last?.position ?? 0) + 1000 },
    include: { items: true },
  });
  return NextResponse.json(checklist, { status: 201 });
});
