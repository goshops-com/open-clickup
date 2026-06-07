import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { readJson, route } from "@/lib/api-helpers";

type Ctx = { params: Promise<{ checklistId: string }> };
const schema = z.object({ name: z.string().trim().min(1, "name is required") });

export const POST = route(async (req, { params }: Ctx) => {
  const { checklistId } = await params;
  const { name } = await readJson(req, schema);
  const last = await prisma.checklistItem.findFirst({ where: { checklistId }, orderBy: { position: "desc" } });
  const item = await prisma.checklistItem.create({
    data: { checklistId, name, position: (last?.position ?? 0) + 1000 },
  });
  return NextResponse.json(item, { status: 201 });
});
